import { z } from "zod";
import { pgTable, serial, text, integer, real, bigint, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Drizzle tables for PostgreSQL
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  department: text("department").notNull(),
  salary: integer("salary").notNull(),
  hireDate: text("hire_date").notNull()
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: real("price").notNull(),
  stock: integer("stock").notNull(),
  supplier: text("supplier").notNull()
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  saleDate: text("sale_date").notNull(),
  customerName: text("customer_name").notNull(),
  totalAmount: real("total_amount").notNull()
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull()
});

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  sqlQuery: text("sql_query"),
  queryResults: jsonb("query_results"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  error: text("error")
});

// Insert schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertChatSchema = createInsertSchema(chats);
export const insertMessageSchema = createInsertSchema(messages);

// Select types
export type User = typeof users.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Chat = typeof chats.$inferSelect;

export interface QueryResults {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTime: number;
}

export type MessageBase = typeof messages.$inferSelect;
export type Message = Omit<MessageBase, 'queryResults'> & {
  queryResults?: QueryResults | null;
};

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Validation schemas
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
  filename: z.string().optional(),
  sqlQuery: z.string().optional()
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
