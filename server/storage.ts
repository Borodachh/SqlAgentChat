import { type Message, messages } from "@shared/schema";
import { db } from "./db";
import { asc } from "drizzle-orm";

export interface IStorage {
  addMessage(message: Message): Promise<void>;
  getMessages(): Promise<Message[]>;
  clearMessages(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async addMessage(message: Message): Promise<void> {
    await db.insert(messages).values({
      id: message.id,
      role: message.role,
      content: message.content,
      sqlQuery: message.sqlQuery ?? null,
      queryResults: message.queryResults ?? null,
      timestamp: message.timestamp,
      error: message.error ?? null
    });
  }

  async getMessages(): Promise<Message[]> {
    const rows = await db.select().from(messages).orderBy(asc(messages.timestamp));
    
    return rows.map(row => ({
      id: row.id,
      role: row.role as "user" | "assistant" | "system",
      content: row.content,
      sqlQuery: row.sqlQuery,
      queryResults: row.queryResults as Message["queryResults"],
      timestamp: Number(row.timestamp),
      error: row.error
    }));
  }

  async clearMessages(): Promise<void> {
    await db.delete(messages);
  }
}

export const storage = new DatabaseStorage();
