import { type Message } from "@shared/schema";
import db from "./database";

export interface IStorage {
  addMessage(message: Message): Promise<void>;
  getMessages(): Promise<Message[]>;
  clearMessages(): Promise<void>;
}

export class SQLiteStorage implements IStorage {
  async addMessage(message: Message): Promise<void> {
    const stmt = db.prepare(`
      INSERT INTO messages (id, role, content, sql_query, query_results, timestamp, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      message.role,
      message.content,
      message.sqlQuery || null,
      message.queryResults ? JSON.stringify(message.queryResults) : null,
      message.timestamp,
      message.error || null
    );
  }

  async getMessages(): Promise<Message[]> {
    const stmt = db.prepare(`
      SELECT * FROM messages ORDER BY timestamp ASC
    `);

    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      role: row.role as "user" | "assistant" | "system",
      content: row.content,
      sqlQuery: row.sql_query || undefined,
      queryResults: row.query_results ? JSON.parse(row.query_results) : undefined,
      timestamp: row.timestamp,
      error: row.error || undefined
    }));
  }

  async clearMessages(): Promise<void> {
    const stmt = db.prepare(`DELETE FROM messages`);
    stmt.run();
  }
}

export const storage = new SQLiteStorage();
