# AI SQL Chat Bot

## Обзор проекта
Веб-приложение чат-бота с AI агентом для преобразования текстовых запросов на естественном языке в SQL запросы. Поддержка множества LLM провайдеров и баз данных с экспортом результатов в Excel и CSV.

## Текущее состояние
Дата: 15 февраля 2026
- ✅ Multi-LLM Support: OpenAI, Ollama, Custom API
- ✅ Multi-Database Support: PostgreSQL, ClickHouse
- ✅ Type-aware SQL generation
- ✅ Export: Excel (.xlsx) с SQL-заголовком и листом Chart Data, CSV
- ✅ Визуализация: Chart.js (столбчатая/линейная диаграмма)
- ✅ Персистентная история сообщений
- ✅ Множественные чаты с историей
- ✅ Предупреждения при опасных SQL-командах (вместо ошибок)
- ✅ Telegram интеграция: отправка Excel/CSV отчётов в Telegram с именем пользователя
- ✅ Мультипользовательский режим: регистрация/логин, изоляция чатов
- **Статус: PRODUCTION READY**

## Новые возможности (v2.0)

### Множественные чаты
- Создание новых чатов через кнопку "+"
- История чатов в сворачиваемой боковой панели
- Автоматическое название чата из первого сообщения
- Удаление чатов с каскадным удалением сообщений
- Сворачиваемый сайдбар с иконками (разворачивается при наведении)

### Multi-LLM Support
- **OpenAI API**: GPT-4, GPT-5 через официальный API или Replit AI Integrations
- **Ollama**: Локальные модели (Llama, Mistral, CodeLlama и др.)
- **Custom API**: Любой OpenAI-совместимый сервер

### Multi-Database Support
- **PostgreSQL**: Neon Serverless с connection pooling
- **ClickHouse**: HTTP API с оптимизированными запросами

### Type-Aware SQL Generation
- Автоматическое определение типа БД
- Оптимизированные подсказки для каждого диалекта
- PostgreSQL: CURRENT_DATE, INTERVAL, LOWER()
- ClickHouse: today(), sumIf(), lower()

### Export
- Excel (.xlsx) с форматированием заголовков
- CSV с UTF-8 BOM для корректной кодировки

## Архитектура

### LLM Config (server/llm-config.ts)
```typescript
LLM_PROVIDER: "openai" | "ollama" | "custom"
DATABASE_TYPE: "postgresql" | "clickhouse"
```

### Database Adapters (server/database-adapters/)
- `base-adapter.ts` - интерфейс DatabaseAdapter
- `postgresql-adapter.ts` - Neon PostgreSQL
- `clickhouse-adapter.ts` - ClickHouse HTTP

### LLM Service (server/llm-service.ts)
- Универсальный сервис для всех провайдеров
- OpenAI SDK для совместимости
- Type-aware system prompts

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

# Системная БД (пользователи, чаты, сессии) — всегда DATABASE_URL
DATABASE_URL=postgresql://...

# Целевая БД для SQL-запросов (опционально, если не задано — используется DATABASE_URL)
TARGET_DATABASE_URL=postgresql://...
TARGET_PGDATABASE=mydb

# ClickHouse
CLICKHOUSE_URL=http://...
CLICKHOUSE_DATABASE=default
```

## API Endpoints

### Чаты
- **GET /api/chats** - Список всех чатов
- **POST /api/chats** - Создание нового чата
- **DELETE /api/chats/:chatId** - Удаление чата

### Сообщения
- **GET /api/chats/:chatId/messages** - История сообщений чата
- **POST /api/chats/:chatId/chat** - Отправка сообщения → SQL → результаты

### Прочее
- **GET /api/config** - Текущая конфигурация LLM и БД
- **POST /api/export?format=xlsx|csv** - Экспорт результатов
- **POST /api/send-telegram** - Отправка Excel/CSV в Telegram (format: xlsx|csv)

## Файловая структура
```
server/
  llm-config.ts          # Конфигурация провайдеров
  llm-service.ts         # Универсальный LLM сервис
  database-adapters/
    base-adapter.ts      # Интерфейс адаптера
    postgresql-adapter.ts
    clickhouse-adapter.ts
    index.ts             # Фабрика адаптеров
  routes.ts              # API endpoints
  storage.ts             # Drizzle storage для сообщений
  db.ts                  # Drizzle ORM подключение
  seed.ts                # Инициализация данных

client/src/
  components/
    ResultsPanel.tsx     # Excel + CSV export + Telegram кнопки
    ...
```

## Безопасность SQL
- Только SELECT и WITH запросы
- Блокировка: DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, TRUNCATE
- Удаление комментариев
- Валидация до выполнения

## Telegram интеграция
- Отправка Excel/CSV отчётов в Telegram через Bot API
- Настройка: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
- Кнопки "TG Excel" и "TG CSV" в панели результатов
- Файл отправляется как документ с SQL-запросом в caption

## Зависимости
- openai - универсальный SDK для всех LLM
- @neondatabase/serverless - PostgreSQL
- drizzle-orm - ORM для сообщений
- exceljs - Excel генерация
- p-retry - retry с backoff

## Готовность к Production
✅ Multi-LLM поддержка
✅ Multi-Database поддержка
✅ Type-aware SQL generation
✅ Excel + CSV export
✅ Telegram интеграция
✅ Graceful shutdown
✅ Error handling
✅ Security validation
