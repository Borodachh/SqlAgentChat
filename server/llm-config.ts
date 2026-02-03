import { z } from "zod";

export const LLMProviderSchema = z.enum(["openai", "ollama", "custom"]);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

export const LLMConfigSchema = z.object({
  provider: LLMProviderSchema,
  model: z.string(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.1),
  maxTokens: z.number().default(2048),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

export const DatabaseTypeSchema = z.enum(["postgresql", "clickhouse"]);
export type DatabaseType = z.infer<typeof DatabaseTypeSchema>;

export const DatabaseConfigSchema = z.object({
  type: DatabaseTypeSchema,
  connectionUrl: z.string(),
  name: z.string().optional(),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

function getEnvWithDefault(key: string, defaultValue: string = ""): string {
  return process.env[key] || defaultValue;
}

export function getLLMConfig(): LLMConfig {
  const provider = getEnvWithDefault("LLM_PROVIDER", "openai") as LLMProvider;
  
  switch (provider) {
    case "ollama":
      return {
        provider: "ollama",
        model: getEnvWithDefault("OLLAMA_MODEL", "llama3.1"),
        baseUrl: getEnvWithDefault("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        temperature: parseFloat(getEnvWithDefault("LLM_TEMPERATURE", "0.1")),
        maxTokens: parseInt(getEnvWithDefault("LLM_MAX_TOKENS", "2048")),
      };
    
    case "custom":
      return {
        provider: "custom",
        model: getEnvWithDefault("CUSTOM_LLM_MODEL", "gpt-4"),
        baseUrl: getEnvWithDefault("CUSTOM_LLM_BASE_URL", ""),
        apiKey: getEnvWithDefault("CUSTOM_LLM_API_KEY", ""),
        temperature: parseFloat(getEnvWithDefault("LLM_TEMPERATURE", "0.1")),
        maxTokens: parseInt(getEnvWithDefault("LLM_MAX_TOKENS", "2048")),
      };
    
    case "openai":
    default:
      return {
        provider: "openai",
        model: getEnvWithDefault("OPENAI_MODEL", "gpt-5"),
        baseUrl: getEnvWithDefault("AI_INTEGRATIONS_OPENAI_BASE_URL", "https://api.openai.com/v1"),
        apiKey: getEnvWithDefault("AI_INTEGRATIONS_OPENAI_API_KEY", ""),
        temperature: parseFloat(getEnvWithDefault("LLM_TEMPERATURE", "0.1")),
        maxTokens: parseInt(getEnvWithDefault("LLM_MAX_TOKENS", "2048")),
      };
  }
}

export function getDatabaseConfig(): DatabaseConfig {
  const dbType = getEnvWithDefault("DATABASE_TYPE", "postgresql") as DatabaseType;
  
  switch (dbType) {
    case "clickhouse":
      return {
        type: "clickhouse",
        connectionUrl: getEnvWithDefault("CLICKHOUSE_URL", "http://localhost:8123"),
        name: getEnvWithDefault("CLICKHOUSE_DATABASE", "default"),
      };
    
    case "postgresql":
    default:
      return {
        type: "postgresql",
        connectionUrl: getEnvWithDefault("DATABASE_URL", ""),
        name: getEnvWithDefault("PGDATABASE", ""),
      };
  }
}

export function getActiveConfig() {
  return {
    llm: getLLMConfig(),
    database: getDatabaseConfig(),
  };
}
