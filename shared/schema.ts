import { z } from "zod";

export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  sqlQuery: z.string().optional(),
  queryResults: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.record(z.any())),
    rowCount: z.number(),
    executionTime: z.number()
  }).optional(),
  timestamp: z.number(),
  error: z.string().optional()
});

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty")
});

export const exportRequestSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.record(z.any())),
  filename: z.string().optional()
});

export type Message = z.infer<typeof messageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
