import OpenAI from "openai";
import pRetry, { AbortError } from "p-retry";
import { getLLMConfig, LLMConfig, DatabaseType } from "./llm-config";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(config: LLMConfig): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey || "ollama",
    });
  }
  return openaiClient;
}

function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

function getSystemPrompt(databaseSchema: string, databaseType: DatabaseType): string {
  const sqlDialect = databaseType === "clickhouse" ? "ClickHouse SQL" : "PostgreSQL";
  const dialectNotes = databaseType === "clickhouse" 
    ? `
- Используй ClickHouse-специфичный синтаксис
- Для агрегаций используй функции типа sumIf, countIf, avgIf
- Используй toDate(), toDateTime() для работы с датами
- Для LIMIT используй стандартный синтаксис LIMIT n
- Строковые функции: lower(), upper(), trim(), substring()
- Для получения текущей даты: today(), now()`
    : `
- Используй PostgreSQL синтаксис
- Для дат: DATE, TIMESTAMP, CURRENT_DATE
- Строковые функции: LOWER(), UPPER(), TRIM(), SUBSTRING()
- Для LIMIT: LIMIT n OFFSET m`;

  return `Ты - эксперт по SQL запросам. Твоя задача - преобразовать вопросы пользователя на естественном языке в корректные ${sqlDialect} запросы.

База данных имеет следующую схему:
${databaseSchema}

Правила:
1. Генерируй только SELECT запросы (без INSERT, UPDATE, DELETE, DROP, ALTER)
2. Используй правильный синтаксис ${sqlDialect}
${dialectNotes}
3. Возвращай результат в формате JSON: { "sqlQuery": "...", "explanation": "..." }
4. В explanation кратко объясни что делает запрос на русском языке
5. Не добавляй markdown форматирование, только чистый JSON
6. Если вопрос неясен или невозможно построить запрос, верни sqlQuery как пустую строку и объяснение в explanation`;
}

export async function generateSQLQuery(
  userMessage: string,
  databaseSchema: string,
  databaseType: DatabaseType = "postgresql"
): Promise<{ sqlQuery: string; explanation: string }> {
  const config = getLLMConfig();
  const client = getOpenAIClient(config);
  
  const systemPrompt = getSystemPrompt(databaseSchema, databaseType);
  const userPrompt = `Вопрос пользователя: ${userMessage}

Сгенерируй SQL запрос для ответа на этот вопрос.`;

  console.log(`[LLM] Using provider: ${config.provider}, model: ${config.model}`);

  try {
    const response = await pRetry(
      async () => {
        try {
          const completionOptions: any = {
            model: config.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
          };

          const isGPT5 = config.model.includes("gpt-5");
          
          if (isGPT5) {
            completionOptions.max_completion_tokens = config.maxTokens;
          } else {
            completionOptions.temperature = config.temperature;
            completionOptions.max_tokens = config.maxTokens;
          }

          if (config.provider !== "ollama") {
            completionOptions.response_format = { type: "json_object" };
          }

          const completion = await client.chat.completions.create(completionOptions);

          let content = completion.choices[0]?.message?.content || "{}";
          
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            content = jsonMatch[0];
          }

          let parsed;
          try {
            parsed = JSON.parse(content);
          } catch (parseError) {
            console.error("Failed to parse LLM response:", content);
            throw new AbortError("Некорректный ответ от AI модели");
          }

          if (typeof parsed.sqlQuery !== 'string' || typeof parsed.explanation !== 'string') {
            console.error("Invalid response structure:", parsed);
            throw new AbortError("Неверная структура ответа от AI модели");
          }

          if (parsed.sqlQuery) {
            const cleanQuery = parsed.sqlQuery.trim().replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '').trim();
            const upperQuery = cleanQuery.toUpperCase();
            
            if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
              console.error("Unsafe SQL query generated:", parsed.sqlQuery);
              throw new AbortError("AI сгенерировал небезопасный SQL запрос");
            }

            const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'EXEC', 'EXECUTE', 'TRUNCATE'];
            for (const keyword of dangerousKeywords) {
              if (upperQuery.includes(keyword) && !upperQuery.includes('SELECT')) {
                console.error("Malicious SQL query detected:", parsed.sqlQuery);
                throw new AbortError("Обнаружен опасный SQL запрос");
              }
            }
          }

          return parsed;
        } catch (error: any) {
          if (error instanceof AbortError) {
            throw error;
          }
          if (isRateLimitError(error)) {
            throw error;
          }
          throw new AbortError(error.message || "Неизвестная ошибка");
        }
      },
      {
        retries: 5,
        minTimeout: 1000,
        maxTimeout: 30000,
        factor: 2,
      }
    );

    return {
      sqlQuery: response.sqlQuery || "",
      explanation: response.explanation || "Не удалось сгенерировать объяснение"
    };
  } catch (error: any) {
    console.error("Error generating SQL query:", error);
    throw new Error(`Ошибка генерации SQL запроса: ${error.message}`);
  }
}

export function resetLLMClient(): void {
  openaiClient = null;
}
