# AI SQL Chat Bot

Веб-приложение чат-бота с AI агентом для преобразования текстовых запросов на естественном языке в SQL запросы с поддержкой множества LLM провайдеров и баз данных.

## Возможности

- **Чат-интерфейс** с поддержкой естественного языка (русский)
- **Множественные чаты** с историей и переключением между ними
- **Сворачиваемая боковая панель** с иконками чатов
- **Множество LLM провайдеров**:
  - OpenAI API (GPT-4, GPT-5)
  - Ollama (локальные модели: Llama, Mistral, и др.)
  - Custom API (любой OpenAI-совместимый сервер)
- **Множество баз данных**:
  - PostgreSQL (Neon Serverless)
  - ClickHouse (с оптимизированными запросами)
- **Type-aware SQL генерация** - запросы оптимизированы под тип БД
- **Экспорт результатов**:
  - Excel (.xlsx) с форматированием
  - CSV с UTF-8 поддержкой
- **Персистентная история** сообщений и чатов между сессиями

## Технологический стек

### Frontend
- React 18 + TypeScript
- TanStack Query (state management)
- Wouter (routing)
- Shadcn UI + Tailwind CSS
- Lucide React (icons)

### Backend
- Express.js
- PostgreSQL (Neon Serverless) / ClickHouse
- Drizzle ORM
- OpenAI SDK (универсальный для всех провайдеров)
- ExcelJS

## Конфигурация

### Переменные окружения

#### LLM Провайдеры

| Переменная | Описание | Значения |
|------------|----------|----------|
| `LLM_PROVIDER` | Тип провайдера | `openai`, `ollama`, `custom` |
| `LLM_TEMPERATURE` | Температура генерации | `0.0` - `2.0` (по умолчанию `0.1`) |
| `LLM_MAX_TOKENS` | Макс. токенов | По умолчанию `2048` |

**OpenAI:**
| Переменная | Описание |
|------------|----------|
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | API URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | API ключ |
| `OPENAI_MODEL` | Модель (по умолчанию `gpt-5`) |

**Ollama (локальные модели):**
| Переменная | Описание |
|------------|----------|
| `OLLAMA_BASE_URL` | URL сервера (по умолчанию `http://localhost:11434/v1`) |
| `OLLAMA_MODEL` | Модель (например `llama3.1`, `mistral`, `codellama`) |

**Custom API:**
| Переменная | Описание |
|------------|----------|
| `CUSTOM_LLM_BASE_URL` | URL OpenAI-совместимого API |
| `CUSTOM_LLM_API_KEY` | API ключ |
| `CUSTOM_LLM_MODEL` | Название модели |

#### Базы данных

| Переменная | Описание | Значения |
|------------|----------|----------|
| `DATABASE_TYPE` | Тип БД | `postgresql`, `clickhouse` |

**PostgreSQL:**
| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Connection string |

**ClickHouse:**
| Переменная | Описание |
|------------|----------|
| `CLICKHOUSE_URL` | URL сервера (например `http://localhost:8123`) |
| `CLICKHOUSE_DATABASE` | Название базы (по умолчанию `default`) |

## Примеры конфигураций

### OpenAI API (по умолчанию)
```bash
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@host/db
```

### Локальная модель через Ollama
```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@host/db
```

### Self-hosted LLM + ClickHouse
```bash
LLM_PROVIDER=custom
CUSTOM_LLM_BASE_URL=http://my-llm-server:8080/v1
CUSTOM_LLM_API_KEY=my-api-key
CUSTOM_LLM_MODEL=my-model
DATABASE_TYPE=clickhouse
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_DATABASE=analytics
```

## Структура проекта

```
ai-sql-chatbot/
├── client/                      # Frontend приложение
│   └── src/
│       ├── components/          # React компоненты
│       │   ├── ChatPanel.tsx    # Панель с историей чата
│       │   ├── ChatInput.tsx    # Поле ввода сообщений
│       │   ├── MessageBubble.tsx # Отдельное сообщение в чате
│       │   ├── ResultsPanel.tsx # Панель с результатами
│       │   ├── ResultsTable.tsx # Таблица результатов SQL
│       │   ├── SQLQueryDisplay.tsx # Отображение SQL запроса
│       │   ├── EmptyState.tsx   # Пустое состояние
│       │   └── ui/              # Shadcn UI компоненты
│       ├── hooks/
│       │   └── use-toast.ts     # Toast notifications hook
│       ├── lib/
│       │   ├── queryClient.ts   # TanStack Query настройка
│       │   └── utils.ts         # Utility функции
│       ├── pages/
│       │   ├── home.tsx         # Главная страница с чатами
│       │   └── not-found.tsx    # 404 страница
│       ├── App.tsx              # Root компонент
│       ├── index.css            # Tailwind + кастомные стили
│       └── main.tsx             # Entry point
│
├── server/                      # Backend приложение
│   ├── llm-config.ts            # Конфигурация LLM провайдеров
│   ├── llm-service.ts           # Универсальный LLM сервис
│   ├── database-adapters/       # Адаптеры баз данных
│   │   ├── base-adapter.ts      # Базовый интерфейс
│   │   ├── postgresql-adapter.ts # PostgreSQL адаптер
│   │   ├── clickhouse-adapter.ts # ClickHouse адаптер
│   │   └── index.ts             # Фабрика адаптеров
│   ├── db.ts                    # Drizzle ORM подключение
│   ├── storage.ts               # DatabaseStorage для чатов и сообщений
│   ├── routes.ts                # API endpoints
│   ├── seed.ts                  # Скрипт инициализации данных
│   ├── index.ts                 # Express сервер + graceful shutdown
│   └── vite.ts                  # Vite dev server integration
│
├── shared/                      # Общий код
│   └── schema.ts                # Drizzle схемы + Zod валидация + TypeScript типы
│
├── design_guidelines.md         # Дизайн система (Material Design)
├── drizzle.config.ts            # Drizzle ORM конфигурация
├── package.json                 # Зависимости и скрипты
├── tailwind.config.ts           # Tailwind CSS конфигурация
├── tsconfig.json                # TypeScript конфигурация
├── vite.config.ts               # Vite конфигурация
└── replit.md                    # Документация проекта
```

## API Endpoints

### Чаты

#### GET /api/chats
Получение списка всех чатов.

**Ответ:**
```json
{
  "chats": [
    {
      "id": "chat-1234567890",
      "title": "Покажи всех сотрудников",
      "createdAt": 1699999999999,
      "updatedAt": 1699999999999
    }
  ]
}
```

#### POST /api/chats
Создание нового чата.

**Ответ:**
```json
{
  "id": "chat-1234567890",
  "title": "Новый чат",
  "createdAt": 1699999999999,
  "updatedAt": 1699999999999
}
```

#### DELETE /api/chats/:chatId
Удаление чата и всех его сообщений.

### Сообщения

#### GET /api/chats/:chatId/messages
Получение истории сообщений чата.

**Ответ:**
```json
{
  "messages": [
    {
      "id": "msg-1234-user",
      "chatId": "chat-1234567890",
      "role": "user",
      "content": "Покажи всех сотрудников",
      "timestamp": 1699999999999
    }
  ]
}
```

#### POST /api/chats/:chatId/chat
Отправка сообщения и получение SQL результатов.

**Запрос:**
```json
{
  "message": "Покажи всех сотрудников из IT отдела"
}
```

**Ответ:**
```json
{
  "id": "msg-1234-assistant",
  "chatId": "chat-1234567890",
  "role": "assistant",
  "content": "Возвращает всех сотрудников из отдела IT",
  "sqlQuery": "SELECT * FROM employees WHERE department = 'IT';",
  "queryResults": {
    "columns": ["id", "name", "position", "department", "salary", "hire_date"],
    "rows": [...],
    "rowCount": 3,
    "executionTime": 12.5
  },
  "timestamp": 1699999999999
}
```

### Конфигурация

#### GET /api/config
Получение текущей конфигурации.

**Ответ:**
```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-5"
  },
  "database": {
    "type": "postgresql"
  }
}
```

### Экспорт

#### POST /api/export?format=xlsx|csv
Экспорт результатов в Excel или CSV.

**Query параметры:**
- `format`: `xlsx` (по умолчанию) или `csv`

**Запрос:**
```json
{
  "columns": ["id", "name", "salary"],
  "rows": [{"id": 1, "name": "Иванов", "salary": 120000}]
}
```

**Ответ:** Binary файл (.xlsx или .csv)

## Безопасность SQL

- Валидация: только SELECT и WITH запросы разрешены
- Блокировка опасных ключевых слов:
  - DROP, DELETE, INSERT, UPDATE
  - ALTER, CREATE, EXEC, EXECUTE, TRUNCATE
- Удаление SQL комментариев из запросов
- Защита от SQL injection через validated queries

## Type-Aware SQL Generation

Система автоматически адаптирует SQL запросы под тип базы данных:

### PostgreSQL
```sql
-- Работа с датами
SELECT * FROM sales WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days';

-- Строковые функции
SELECT LOWER(name), UPPER(department) FROM employees;
```

### ClickHouse
```sql
-- Работа с датами
SELECT * FROM sales WHERE sale_date >= today() - 30;

-- Агрегации с условиями
SELECT sumIf(total_amount, quantity > 10) FROM sales;

-- Строковые функции
SELECT lower(name), upper(department) FROM employees;
```

## Запуск проекта

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm run start
```

### Database
```bash
npm run db:push    # Синхронизация схемы
```

## Примеры запросов

| Естественный язык | SQL (PostgreSQL) |
|-------------------|------------------|
| "Покажи всех сотрудников" | `SELECT * FROM employees;` |
| "Кто зарабатывает больше 100000?" | `SELECT * FROM employees WHERE salary > 100000;` |
| "Топ 5 самых дорогих продуктов" | `SELECT * FROM products ORDER BY price DESC LIMIT 5;` |
| "Общая сумма продаж по клиентам" | `SELECT customer_name, SUM(total_amount) FROM sales GROUP BY customer_name;` |

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Chat Sidebar│    │  ChatPanel  │    │ResultsPanel │     │
│  │ (Collapsible)    │             │    │ + Export    │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         └─────────────────┼───────────────────┘            │
│                    TanStack Query                           │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Routes    │───▶│ LLM Service │───▶│  Validator  │     │
│  │ /api/chats  │    └──────┬──────┘    └──────┬──────┘     │
│  └──────┬──────┘           │                   │            │
│         │           ┌──────┴──────┐           │            │
│         │           │ LLM Config  │           │            │
│         │           │ OpenAI/Ollama/Custom    │            │
│         │           └─────────────┘           │            │
│         ▼                                      ▼            │
│  ┌─────────────┐                       ┌─────────────┐     │
│  │   Storage   │◀──────────────────────│ DB Adapters │     │
│  │ chats/msgs  │                       └──────┬──────┘     │
│  └──────┬──────┘                              │            │
└─────────┼─────────────────────────────────────┼─────────────┘
          │                                      │
          ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌───────────────────────┐    ┌───────────────────────┐    │
│  │   PostgreSQL (Neon)   │    │      ClickHouse       │    │
│  │ chats, messages       │    │   analytics, events   │    │
│  │ employees, products   │    │   logs, metrics       │    │
│  │ sales                 │    │                       │    │
│  └───────────────────────┘    └───────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## База данных

### Таблицы

**chats** - Список чатов
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | text | Уникальный ID чата |
| title | text | Название чата (из первого сообщения) |
| created_at | bigint | Время создания |
| updated_at | bigint | Время последнего обновления |

**messages** - Сообщения чатов
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | text | Уникальный ID сообщения |
| chat_id | text | ID чата (FK) |
| role | text | user / assistant / system |
| content | text | Текст сообщения |
| sql_query | text | SQL запрос (nullable) |
| query_results | jsonb | Результаты запроса (nullable) |
| timestamp | bigint | Время сообщения |
| error | text | Ошибка (nullable) |

## Лицензия

MIT
