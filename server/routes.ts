import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, exportRequestSchema, type Message, type Chat } from "@shared/schema";
import { generateSQLQuery } from "./llm-service";
import { getActiveAdapter, getCurrentAdapterType, disconnectAdapter } from "./database-adapters";
import { getActiveConfig } from "./llm-config";
import ExcelJS from "exceljs";
import path from "path";
import { z } from "zod";

const chatIdSchema = z.object({
  chatId: z.string().min(1)
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/chats", async (req: Request, res: Response) => {
    try {
      const chats = await storage.getChats();
      res.json({ chats });
    } catch (err: any) {
      console.error("Error in /api/chats:", err);
      res.status(500).json({ error: err.message || "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/chats", async (req: Request, res: Response) => {
    try {
      const now = Date.now();
      const chat: Chat = {
        id: `chat-${now}`,
        title: "Новый чат",
        createdAt: now,
        updatedAt: now
      };
      await storage.createChat(chat);
      res.json(chat);
    } catch (err: any) {
      console.error("Error in POST /api/chats:", err);
      res.status(500).json({ error: err.message || "Внутренняя ошибка сервера" });
    }
  });

  app.delete("/api/chats/:chatId", async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      await storage.deleteChat(chatId);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in DELETE /api/chats:", err);
      res.status(500).json({ error: err.message || "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/chats/:chatId/messages", async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const messages = await storage.getMessages(chatId);
      res.json({ messages });
    } catch (err: any) {
      console.error("Error in /api/messages:", err);
      res.status(500).json({ error: err.message || "Внутренняя ошибка сервера" });
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

  app.post("/api/chats/:chatId/chat", async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const { message } = chatRequestSchema.parse(req.body);

      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ error: "Чат не найден" });
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        chatId,
        role: "user",
        content: message,
        timestamp: Date.now(),
        sqlQuery: null,
        queryResults: null,
        error: null
      };
      await storage.addMessage(userMessage);

      if (chat.title === "Новый чат") {
        const title = message.length > 30 ? message.substring(0, 30) + "..." : message;
        await storage.updateChat(chatId, title);
      }

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
          chatId,
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
          chatId,
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
        chatId,
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
      const { columns, rows, filename, sqlQuery } = exportRequestSchema.parse(req.body);
      const format = req.query.format as string || "xlsx";

      if (format === "csv") {
        const csvRows: string[] = [];
        
        if (sqlQuery) {
          csvRows.push(`"SQL запрос: ${sqlQuery.replace(/"/g, '""')}"`);
          csvRows.push("");
        }
        
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

      let dataStartRow = 1;

      if (sqlQuery) {
        const lastColLetter = worksheet.getColumn(Math.max(columns.length, 1)).letter;
        worksheet.mergeCells(`A1:${lastColLetter}1`);
        const queryCell = worksheet.getCell('A1');
        queryCell.value = `SQL: ${sqlQuery}`;
        queryCell.font = { italic: true, color: { argb: 'FF555555' } };
        queryCell.alignment = { wrapText: true };
        worksheet.getRow(1).height = 30;
        dataStartRow = 3;
      }

      worksheet.columns = columns.map(col => ({
        header: col,
        key: col,
        width: 20
      }));

      if (dataStartRow > 1) {
        const headerRow = worksheet.getRow(dataStartRow);
        columns.forEach((col, i) => {
          headerRow.getCell(i + 1).value = col;
        });
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };

        rows.forEach((row, idx) => {
          const excelRow = worksheet.getRow(dataStartRow + 1 + idx);
          columns.forEach((col, i) => {
            excelRow.getCell(i + 1).value = row[col] ?? "";
          });
        });
      } else {
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };

        rows.forEach(row => {
          worksheet.addRow(row);
        });
      }

      const labelCandidates: string[] = [];
      const numericCandidates: string[] = [];
      const sampleRows = rows.slice(0, 20);

      for (const col of columns) {
        let numCount = 0;
        let textCount = 0;
        for (const row of sampleRows) {
          const val = row[col];
          if (val === null || val === undefined) continue;
          if (typeof val === "number" || (!isNaN(Number(val)) && val !== "")) {
            numCount++;
          } else {
            textCount++;
          }
        }
        if (numCount > textCount && numCount > 0) {
          numericCandidates.push(col);
        } else {
          labelCandidates.push(col);
        }
      }

      const chartLabelCol = labelCandidates[0] || columns[0];
      const chartValueCols = numericCandidates.filter(c => c !== chartLabelCol);

      if (chartValueCols.length > 0 && columns.length <= 5 && rows.length >= 2) {
        const chartSheet = workbook.addWorksheet("Chart Data");
        
        const chartCols = [chartLabelCol, ...chartValueCols];
        chartSheet.columns = chartCols.map(col => ({
          header: col,
          key: col,
          width: 18
        }));

        chartSheet.getRow(1).font = { bold: true };
        chartSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        chartSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        rows.forEach(row => {
          const chartRow: Record<string, any> = {};
          chartCols.forEach(col => {
            chartRow[col] = row[col] ?? "";
          });
          chartSheet.addRow(chartRow);
        });

        const noteRow = chartSheet.addRow([]);
        const note2 = chartSheet.addRow(["Выделите данные и нажмите Вставка → Диаграмма для создания графика"]);
        note2.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
      }

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
