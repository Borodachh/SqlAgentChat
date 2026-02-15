# AI SQL Chat Bot

## Обзор проекта
Веб-приложение с AI-агентом для преобразования запросов на естественном языке в SQL. Поддержка множества LLM-провайдеров и типов баз данных, экспорт в Excel/CSV с LLM-генерируемыми заголовками на русском, отправка отчётов в Telegram.

## Текущее состояние
Дата: 15 февраля 2026
- ✅ Multi-LLM: OpenAI, Ollama, Custom API
- ✅ Multi-Database: PostgreSQL, ClickHouse
- ✅ Type-aware SQL generation
- ✅ Экспорт: Excel (.xlsx) и CSV с LLM-заголовком на русском и датой
- ✅ Визуализация: Chart.js (столбчатая/линейная)
- ✅ Множественные чаты с историей
- ✅ Шаблоны SQL-запросов (сохранение/повторное использование)
- ✅ Telegram: отчёты с описанием на русском (через LLM)
- ✅ Мультипользовательский режим: регистрация/логин, изоляция чатов
- ✅ Разделение системной и целевой БД
- ✅ Просмотр схемы целевой БД
- ✅ Docker + docker-compose для self-hosting
- **Статус: PRODUCTION READY**

## Ключевые функции

### LLM-генерируемые заголовки (generateSQLTitle)
- Функция в server/llm-service.ts генерирует краткое описание SQL-запроса на русском
- Используется в Excel/CSV экспорте (строка 1: заголовок, строка 2: дата)
- Используется в Telegram caption вместо сырого SQL
- Fallback: "Отчёт" если LLM недоступен

### Шаблоны SQL-запросов
- Таблица templates в shared/schema.ts (userId, name, description, sqlQuery)
- CRUD: GET/POST/DELETE /api/templates
- Диалог TemplatesDialog.tsx для управления шаблонами
- Кнопка сохранения в ResultsPanel.tsx

### Экспорт
- Excel: строка 1 — LLM-заголовок (merged, centered, bold 14pt), строка 2 — дата, строка 4+ — данные
- CSV: строка 1 — заголовок, строка 2 — дата, строка 3 — пустая, строка 4+ — данные
- Telegram: файл + caption (username + заголовок + кол-во строк)

## Архитектура

### LLM Config (server/llm-config.ts)
```typescript
LLM_PROVIDER: "openai" | "ollama" | "custom"
DATABASE_TYPE: "postgresql" | "clickhouse"
```

### Database Adapters (server/database-adapters/)
- `base-adapter.ts` — интерфейс DatabaseAdapter
- `postgresql-adapter.ts` — Neon PostgreSQL
- `clickhouse-adapter.ts` — ClickHouse HTTP

### LLM Service (server/llm-service.ts)
- generateSQL() — генерация SQL из текста
- generateSQLTitle() — генерация описания SQL на русском
- OpenAI SDK для совместимости со всеми провайдерами

## Конфигурация через ENV

### LLM
```env
LLM_PROVIDER=openai|ollama|custom
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=2048

# OpenAI
OPENAI_MODEL=gpt-5
AI_INTEGRATIONS_OPENAI_BASE_URL=...
AI_INTEGRATIONS_OPENAI_API_KEY=...

# Ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1

# Custom
CUSTOM_LLM_BASE_URL=...
CUSTOM_LLM_API_KEY=...
CUSTOM_LLM_MODEL=...
```

### Database
```env
DATABASE_TYPE=postgresql|clickhouse

# Системная БД (пользователи, чаты, сессии)
DATABASE_URL=postgresql://...

# Целевая БД для SQL-запросов (опционально)
TARGET_DATABASE_URL=postgresql://...
TARGET_PGDATABASE=mydb

# ClickHouse
CLICKHOUSE_URL=http://...
CLICKHOUSE_DATABASE=default
```

## API Endpoints

### Авторизация
- **POST /api/register** — регистрация
- **POST /api/login** — вход
- **POST /api/logout** — выход
- **GET /api/user** — текущий пользователь

### Чаты
- **GET /api/chats** — список чатов
- **POST /api/chats** — создание чата
- **DELETE /api/chats/:chatId** — удаление чата

### Сообщения
- **GET /api/chats/:chatId/messages** — история
- **POST /api/chats/:chatId/chat** — запрос → SQL → результат

### Шаблоны
- **GET /api/templates** — список шаблонов
- **POST /api/templates** — сохранить шаблон
- **DELETE /api/templates/:id** — удалить шаблон

### Экспорт
- **POST /api/export?format=xlsx|csv** — скачать Excel/CSV
- **POST /api/send-telegram** — отправить в Telegram (format: xlsx|csv)
- **GET /api/config** — конфигурация
- **GET /api/tables** — таблицы целевой БД

## Файловая структура
```
server/
  index.ts               # Express, graceful shutdown
  routes.ts              # API endpoints
  storage.ts             # Drizzle storage
  db.ts                  # Drizzle ORM
  seed.ts                # Тестовые данные (50K employees, 50K products, 200K sales)
  llm-config.ts          # Конфигурация провайдеров
  llm-service.ts         # SQL генерация + заголовки
  vite.ts                # Vite dev middleware
  database-adapters/
    base-adapter.ts      # Интерфейс
    postgresql-adapter.ts
    clickhouse-adapter.ts
    index.ts             # Фабрика

client/src/
  App.tsx                # Роутинг, layout
  pages/
    home.tsx             # Сайдбар + чат + результаты
    auth.tsx             # Логин/регистрация
    not-found.tsx
  components/
    ChatPanel.tsx        # Чат с сообщениями
    ChatInput.tsx        # Поле ввода
    MessageBubble.tsx    # Сообщение
    ResultsPanel.tsx     # Таблица + экспорт + шаблоны + TG
    ResultsTable.tsx     # Таблица данных
    ChartView.tsx        # Диаграммы
    EmptyState.tsx       # Пустое состояние
    SQLQueryDisplay.tsx  # SQL-запрос
    TemplatesDialog.tsx  # Шаблоны
  hooks/
    useAuth.ts           # Авторизация
    use-toast.ts         # Уведомления
  lib/
    queryClient.ts       # React Query
    utils.ts

shared/
  schema.ts              # users, chats, messages, templates + Zod
```

## Безопасность SQL
- Только SELECT и WITH
- Блокировка: DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, TRUNCATE
- Удаление комментариев
- Валидация до выполнения

## Зависимости
- openai — универсальный SDK для всех LLM
- @neondatabase/serverless — PostgreSQL
- drizzle-orm — ORM
- exceljs — Excel
- bcrypt — хеширование паролей
- connect-pg-simple — сессии в PostgreSQL
- chart.js + react-chartjs-2 — визуализация
