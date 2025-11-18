import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, exportRequestSchema, type Message } from "@shared/schema";
import { generateSQLQuery } from "./openai-service";
import { executeQuery, getDatabaseSchema } from "./database";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/messages", async (req: Request, res: Response) => {
    try {
      const messages = await storage.getMessages();
      res.json({ messages });
    } catch (err: any) {
      console.error("Error in /api/messages:", err);
      res.status(500).json({ 
        error: err.message || "Внутренняя ошибка сервера" 
      });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message } = chatRequestSchema.parse(req.body);

      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: message,
        timestamp: Date.now()
      };
      await storage.addMessage(userMessage);

      const databaseSchema = getDatabaseSchema();
      let sqlQuery = "";
      let explanation = "";
      
      try {
        const result = await generateSQLQuery(message, databaseSchema);
        sqlQuery = result.sqlQuery;
        explanation = result.explanation;
      } catch (err: any) {
        const errorMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: `Ошибка генерации SQL: ${err.message}`,
          timestamp: Date.now(),
          error: err.message
        };
        await storage.addMessage(errorMessage);
        
        return res.json({
          response: errorMessage.content,
          error: err.message
        });
      }

      if (!sqlQuery) {
        const noQueryMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: explanation || "Не удалось сгенерировать SQL запрос для данного вопроса.",
          timestamp: Date.now(),
          error: "Невозможно построить SQL запрос"
        };
        await storage.addMessage(noQueryMessage);
        
        return res.json({
          response: noQueryMessage.content,
          error: noQueryMessage.error
        });
      }

      const startTime = performance.now();
      let queryResults;
      let error;

      try {
        const result = executeQuery(sqlQuery);
        const endTime = performance.now();
        
        const serializedRows = result.rows.map(row => {
          const serializedRow: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            if (value instanceof Date) {
              serializedRow[key] = value.toISOString();
            } else if (typeof value === 'bigint') {
              serializedRow[key] = value.toString();
            } else {
              serializedRow[key] = value;
            }
          }
          return serializedRow;
        });

        queryResults = {
          columns: result.columns,
          rows: serializedRows,
          rowCount: result.rowCount,
          executionTime: endTime - startTime
        };
      } catch (err: any) {
        error = `Ошибка выполнения SQL: ${err.message}`;
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: error || explanation,
        sqlQuery,
        queryResults,
        timestamp: Date.now(),
        error
      };
      await storage.addMessage(assistantMessage);

      res.json({
        response: assistantMessage.content,
        sqlQuery,
        queryResults,
        error
      });
    } catch (err: any) {
      console.error("Error in /api/chat:", err);
      res.status(500).json({ 
        error: err.message || "Внутренняя ошибка сервера" 
      });
    }
  });

  app.post("/api/export", async (req: Request, res: Response) => {
    try {
      const { columns, rows, filename } = exportRequestSchema.parse(req.body);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Query Results");

      worksheet.columns = columns.map(col => ({
        header: col,
        key: col,
        width: 20
      }));

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      rows.forEach(row => {
        worksheet.addRow(row);
      });

      const finalFilename = filename || `query_results_${Date.now()}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (err: any) {
      console.error("Error in /api/export:", err);
      res.status(500).json({ 
        error: err.message || "Ошибка создания Excel файла" 
      });
    }
  });

  app.use("/exports", (req, res, next) => {
    const exportsDir = path.join(process.cwd(), "exports");
    return require("express").static(exportsDir)(req, res, next);
  });

  const httpServer = createServer(app);

  return httpServer;
}
