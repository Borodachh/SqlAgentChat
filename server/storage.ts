import { type Message, type Chat, type User, type SqlTemplate, messages, chats, users, sqlTemplates } from "@shared/schema";
import { db } from "./db";
import { asc, desc, eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  createUser(username: string, password: string): Promise<User>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  validatePassword(user: User, password: string): Promise<boolean>;
  createChat(chat: Chat): Promise<void>;
  getChats(userId: number): Promise<Chat[]>;
  getChat(id: string): Promise<Chat | null>;
  updateChat(id: string, title: string): Promise<void>;
  deleteChat(id: string): Promise<void>;
  addMessage(message: Message): Promise<void>;
  getMessages(chatId: string): Promise<Message[]>;
  clearMessages(chatId: string): Promise<void>;
  getTemplates(userId: number): Promise<SqlTemplate[]>;
  createTemplate(userId: number, name: string, sqlQuery: string, description?: string): Promise<SqlTemplate>;
  deleteTemplate(id: number, userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async createUser(username: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({
      username,
      passwordHash,
      createdAt: Date.now()
    }).returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0] || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0] || null;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async createChat(chat: Chat): Promise<void> {
    await db.insert(chats).values({
      id: chat.id,
      title: chat.title,
      userId: chat.userId,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    });
  }

  async getChats(userId: number): Promise<Chat[]> {
    const rows = await db.select().from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt));
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      userId: row.userId,
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
      userId: row.userId,
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

  async getTemplates(userId: number): Promise<SqlTemplate[]> {
    const rows = await db.select().from(sqlTemplates)
      .where(eq(sqlTemplates.userId, userId))
      .orderBy(desc(sqlTemplates.createdAt));
    return rows.map(row => ({
      ...row,
      createdAt: Number(row.createdAt)
    }));
  }

  async createTemplate(userId: number, name: string, sqlQuery: string, description?: string): Promise<SqlTemplate> {
    const [template] = await db.insert(sqlTemplates).values({
      userId,
      name,
      sqlQuery,
      description: description || null,
      createdAt: Date.now()
    }).returning();
    return { ...template, createdAt: Number(template.createdAt) };
  }

  async deleteTemplate(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(sqlTemplates)
      .where(and(eq(sqlTemplates.id, id), eq(sqlTemplates.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
