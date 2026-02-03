import { type Message, type Chat, messages, chats } from "@shared/schema";
import { db } from "./db";
import { asc, desc, eq } from "drizzle-orm";

export interface IStorage {
  createChat(chat: Chat): Promise<void>;
  getChats(): Promise<Chat[]>;
  getChat(id: string): Promise<Chat | null>;
  updateChat(id: string, title: string): Promise<void>;
  deleteChat(id: string): Promise<void>;
  addMessage(message: Message): Promise<void>;
  getMessages(chatId: string): Promise<Message[]>;
  clearMessages(chatId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createChat(chat: Chat): Promise<void> {
    await db.insert(chats).values({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    });
  }

  async getChats(): Promise<Chat[]> {
    const rows = await db.select().from(chats).orderBy(desc(chats.updatedAt));
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt)
    }));
  }

  async getChat(id: string): Promise<Chat | null> {
    const rows = await db.select().from(chats).where(eq(chats.id, id));
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      title: row.title,
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt)
    };
  }

  async updateChat(id: string, title: string): Promise<void> {
    await db.update(chats)
      .set({ title, updatedAt: Date.now() })
      .where(eq(chats.id, id));
  }

  async deleteChat(id: string): Promise<void> {
    await db.delete(chats).where(eq(chats.id, id));
  }

  async addMessage(message: Message): Promise<void> {
    await db.insert(messages).values({
      id: message.id,
      chatId: message.chatId,
      role: message.role,
      content: message.content,
      sqlQuery: message.sqlQuery ?? null,
      queryResults: message.queryResults ?? null,
      timestamp: message.timestamp,
      error: message.error ?? null
    });

    await db.update(chats)
      .set({ updatedAt: message.timestamp })
      .where(eq(chats.id, message.chatId));
  }

  async getMessages(chatId: string): Promise<Message[]> {
    const rows = await db.select().from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.timestamp));
    
    return rows.map(row => ({
      id: row.id,
      chatId: row.chatId,
      role: row.role as "user" | "assistant" | "system",
      content: row.content,
      sqlQuery: row.sqlQuery,
      queryResults: row.queryResults as Message["queryResults"],
      timestamp: Number(row.timestamp),
      error: row.error
    }));
  }

  async clearMessages(chatId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.chatId, chatId));
  }
}

export const storage = new DatabaseStorage();
