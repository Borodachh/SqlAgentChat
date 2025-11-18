import OpenAI from "openai";
import pRetry from "p-retry";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access
// without requiring your own OpenAI API key. Uses blueprint: javascript_openai_ai_integrations
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

export async function generateSQLQuery(
  userMessage: string,
  databaseSchema: string
): Promise<{ sqlQuery: string; explanation: string }> {
  const systemPrompt = `Ты - эксперт по SQL запросам. Твоя задача - преобразовать вопросы пользователя на естественном языке в корректные SQL запросы.

База данных SQLite имеет следующую схему:
${databaseSchema}

Правила:
1. Генерируй только SELECT запросы (без INSERT, UPDATE, DELETE)
2. Используй правильный синтаксис SQLite
3. Возвращай результат в формате JSON: { "sqlQuery": "...", "explanation": "..." }
4. В explanation кратко объясни что делает запрос на русском языке
5. Не добавляй markdown форматирование, только чистый JSON
6. Если вопрос неясен или невозможно построить запрос, верни sqlQuery как пустую строку и объяснение в explanation`;

  const userPrompt = `Вопрос пользователя: ${userMessage}

Сгенерируй SQL запрос для ответа на этот вопрос.`;

  try {
    const response = await pRetry(
      async () => {
        try {
          // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
          const completion = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 2048,
          });

          const content = completion.choices[0]?.message?.content || "{}";
          let parsed;
          try {
            parsed = JSON.parse(content);
          } catch (parseError) {
            console.error("Failed to parse OpenAI response:", content);
            throw new pRetry.AbortError(new Error("Некорректный ответ от AI модели"));
          }

          if (typeof parsed.sqlQuery !== 'string' || typeof parsed.explanation !== 'string') {
            console.error("Invalid response structure:", parsed);
            throw new pRetry.AbortError(new Error("Неверная структура ответа от AI модели"));
          }

          if (parsed.sqlQuery) {
            const cleanQuery = parsed.sqlQuery.trim().replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '').trim();
            const upperQuery = cleanQuery.toUpperCase();
            
            if (!upperQuery.startsWith('SELECT')) {
              console.error("Unsafe SQL query generated:", parsed.sqlQuery);
              throw new pRetry.AbortError(new Error("AI сгенерировал небезопасный SQL запрос"));
            }

            if (upperQuery.includes('DROP') || upperQuery.includes('DELETE') || 
                upperQuery.includes('INSERT') || upperQuery.includes('UPDATE') ||
                upperQuery.includes('ALTER') || upperQuery.includes('CREATE') ||
                upperQuery.includes('EXEC') || upperQuery.includes('EXECUTE')) {
              console.error("Malicious SQL query detected:", parsed.sqlQuery);
              throw new pRetry.AbortError(new Error("Обнаружен опасный SQL запрос"));
            }
          }

          return parsed;
        } catch (error: any) {
          if (error instanceof pRetry.AbortError) {
            throw error;
          }
          if (isRateLimitError(error)) {
            throw error;
          }
          throw new pRetry.AbortError(error);
        }
      },
      {
        retries: 7,
        minTimeout: 2000,
        maxTimeout: 128000,
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
