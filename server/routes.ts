import type { Express, Request, Response, NextFunction } from "express";
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

const authSchema = z.object({
  username: z.string().min(2, "Имя пользователя должно содержать минимум 2 символа"),
  password: z.string().min(4, "Пароль должен содержать минимум 4 символа")
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Необходима авторизация" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password } = authSchema.parse(req.body);
      
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Пользователь с таким именем уже существует" });
      }

      const user = await storage.createUser(username, password);
      req.session.userId = user.id;
      req.session.username = user.username;

      res.json({ id: user.id, username: user.username });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("Error in /api/auth/register:", err);
      res.status(500).json({ error: err.message || "Ошибка регистрации" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = authSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Неверное имя пользователя или пароль" });
      }

      const valid = await storage.validatePassword(user, password);
      if (!valid) {
        return res.status(401).json({ error: "Неверное имя пользователя или пароль" });
      }

      req.session.userId = user.id;
      req.session.username = user.username;

      res.json({ id: user.id, username: user.username });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("Error in /api/auth/login:", err);
      res.status(500).json({ error: err.message || "Ошибка входа" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Ошибка выхода" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (req.session.userId) {
      res.json({ id: req.session.userId, username: req.session.username });
    } else {
      res.status(401).json({ error: "Не авторизован" });
    }
  });

  app.get("/api/chats", requireAuth, async (req: Request, res: Response) => {
    try {
      const chats = await storage.getChats(req.session.userId!);
      res.json({ chats });
    } catch (err: any) {
      console.error("Error in /api/chats:", err);
      res.status(500).json({ error: err.message || "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/chats", requireAuth, async (req: Request, res: Response) => {
    try {
      const now = Date.now();
      const chat: Chat = {
        id: `chat-${now}`,
        title: "Новый чат",
        userId: req.session.userId!,
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

  app.delete("/api/chats/:chatId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const chat = await storage.getChat(chatId);
      if (!chat || chat.userId !== req.session.userId) {
        return res.status(404).json({ error: "Чат не найден" });
      }
      await storage.deleteChat(chatId);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in DELETE /api/chats:", err);
      res.status(500).json({ error: err.message || "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/chats/:chatId/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const chat = await storage.getChat(chatId);
      if (!chat || chat.userId !== req.session.userId) {
        return res.status(404).json({ error: "Чат не найден" });
      }
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

  app.get("/api/tables", requireAuth, async (req: Request, res: Response) => {
    try {
      const adapter = await getActiveAdapter();
      const tables = await adapter.getTables();
      res.json({ tables });
    } catch (err: any) {
      console.error("Error in /api/tables:", err);
      res.status(500).json({ error: err.message || "Ошибка получения списка таблиц" });
    }
  });

  app.post("/api/chats/:chatId/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const { message } = chatRequestSchema.parse(req.body);

      const chat = await storage.getChat(chatId);
      if (!chat || chat.userId !== req.session.userId) {
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

  app.post("/api/export", requireAuth, async (req: Request, res: Response) => {
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

  app.post("/api/send-telegram", requireAuth, async (req: Request, res: Response) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!botToken || !chatId) {
        return res.status(400).json({ error: "Telegram не настроен. Укажите TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID." });
      }

      const { columns, rows, sqlQuery, format } = exportRequestSchema.extend({
        format: z.enum(["xlsx", "csv"]).default("xlsx")
      }).parse(req.body);

      const username = req.session.username || "Unknown";

      let fileBuffer: Buffer;
      let filename: string;
      let mimeType: string;

      if (format === "csv") {
        const csvRows: string[] = [];
        if (sqlQuery) {
          csvRows.push(`"SQL: ${sqlQuery.replace(/"/g, '""')}"`);
          csvRows.push("");
        }
        csvRows.push(columns.map(col => `"${col.replace(/"/g, '""')}"`).join(","));
        rows.forEach(row => {
          const rowValues = columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return "";
            return `"${String(value).replace(/"/g, '""')}"`;
          });
          csvRows.push(rowValues.join(","));
        });
        fileBuffer = Buffer.from("\uFEFF" + csvRows.join("\n"), "utf-8");
        filename = `report_${Date.now()}.csv`;
        mimeType = "text/csv";
      } else {
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

        worksheet.columns = columns.map(col => ({ header: col, key: col, width: 20 }));

        if (dataStartRow > 1) {
          const headerRow = worksheet.getRow(dataStartRow);
          columns.forEach((col, i) => { headerRow.getCell(i + 1).value = col; });
          headerRow.font = { bold: true };
          headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
          rows.forEach((row, idx) => {
            const excelRow = worksheet.getRow(dataStartRow + 1 + idx);
            columns.forEach((col, i) => { excelRow.getCell(i + 1).value = row[col] ?? ""; });
          });
        } else {
          worksheet.getRow(1).font = { bold: true };
          worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
          rows.forEach(row => { worksheet.addRow(row); });
        }

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        filename = `report_${Date.now()}.xlsx`;
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }

      let caption = `${username}`;
      if (sqlQuery) {
        caption += `\nSQL: ${sqlQuery.substring(0, 200)}${sqlQuery.length > 200 ? '...' : ''}`;
      }
      caption += `\nRows: ${rows.length}`;

      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("caption", caption);
      formData.append("document", new Blob([fileBuffer], { type: mimeType }), filename);

      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: "POST",
        body: formData
      });

      const telegramResult = await telegramResponse.json() as any;

      if (!telegramResult.ok) {
        throw new Error(telegramResult.description || "Ошибка отправки в Telegram");
      }

      res.json({ success: true, message: `Файл ${filename} отправлен в Telegram` });
    } catch (err: any) {
      console.error("Error in /api/send-telegram:", err);
      res.status(500).json({ error: err.message || "Ошибка отправки в Telegram" });
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
