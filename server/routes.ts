import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, exportRequestSchema, type Message } from "@shared/schema";
import { generateSQLQuery } from "./llm-service";
import { getActiveAdapter, getCurrentAdapterType, disconnectAdapter } from "./database-adapters";
import { getActiveConfig } from "./llm-config";
import ExcelJS from "exceljs";
import path from "path";

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

  app.get("/api/config", async (req: Request, res: Response) => {
    try {
      const config = getActiveConfig();
      res.json({
        llm: {
          provider: config.llm.provider,
          model: config.llm.model,
        },
        database: {
          type: config.database.type,
        }
      });
    } catch (err: any) {
      console.error("Error in /api/config:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message } = chatRequestSchema.parse(req.body);

      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: message,
        timestamp: Date.now(),
        sqlQuery: null,
        queryResults: null,
        error: null
      };
      await storage.addMessage(userMessage);

      const adapter = await getActiveAdapter();
      const databaseType = getCurrentAdapterType();
      const databaseSchema = await adapter.getSchema();
      
      let sqlQuery = "";
      let explanation = "";
      
      try {
        const result = await generateSQLQuery(message, databaseSchema, databaseType);
        sqlQuery = result.sqlQuery;
        explanation = result.explanation;
      } catch (err: any) {
        const errorMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: `Ошибка генерации SQL: ${err.message}`,
          timestamp: Date.now(),
          sqlQuery: null,
          queryResults: null,
          error: err.message
        };
        await storage.addMessage(errorMessage);
        
        return res.json(errorMessage);
      }

      if (!sqlQuery) {
        const noQueryMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: explanation || "Не удалось сгенерировать SQL запрос для данного вопроса.",
          timestamp: Date.now(),
          sqlQuery: null,
          queryResults: null,
          error: "Невозможно построить SQL запрос"
        };
        await storage.addMessage(noQueryMessage);
        
        return res.json(noQueryMessage);
      }

      const startTime = performance.now();
      let queryResults: Message["queryResults"] = null;
      let error: string | null = null;

      try {
        const result = await adapter.executeQuery(sqlQuery);
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
        sqlQuery: sqlQuery || null,
        queryResults,
        timestamp: Date.now(),
        error
      };
      await storage.addMessage(assistantMessage);

      res.json(assistantMessage);
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
      const format = req.query.format as string || "xlsx";

      if (format === "csv") {
        const csvRows: string[] = [];
        
        csvRows.push(columns.map(col => `"${col.replace(/"/g, '""')}"`).join(","));
        
        rows.forEach(row => {
          const rowValues = columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return "";
            const strValue = String(value).replace(/"/g, '""');
            return `"${strValue}"`;
          });
          csvRows.push(rowValues.join(","));
        });

        const csvContent = csvRows.join("\n");
        const finalFilename = filename?.replace(/\.xlsx$/, ".csv") || `query_results_${Date.now()}.csv`;
        
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${finalFilename}"`);
        res.send("\uFEFF" + csvContent);
        return;
      }

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
        error: err.message || "Ошибка создания файла экспорта" 
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

export { disconnectAdapter };
