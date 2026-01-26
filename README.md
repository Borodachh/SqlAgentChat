# AI SQL Chat Bot

Веб-приложение чат-бота с AI агентом для преобразования текстовых запросов на естественном языке в SQL запросы и экспорта результатов в Excel файлы.

## Возможности

- **Чат-интерфейс** с поддержкой естественного языка (русский)
- **AI агент на базе GPT-5** для преобразования текста в SQL
- **PostgreSQL база данных** с примерными данными (сотрудники, продукты, продажи)
- **Отображение результатов** в удобной таблице
- **Экспорт в Excel** (.xlsx) одним кликом
- **Персистентная история** сообщений между сессиями

## Технологический стек

### Frontend
- React 18 + TypeScript
- TanStack Query (state management)
- Wouter (routing)
- Shadcn UI + Tailwind CSS
- Lucide React (icons)

### Backend
- Express.js
- PostgreSQL (Neon Serverless)
- Drizzle ORM
- OpenAI SDK (GPT-5)
- ExcelJS

## Структура проекта

```
ai-sql-chatbot/
├── client/                      # Frontend приложение
│   └── src/
│       ├── components/          # React компоненты
│       │   ├── ChatPanel.tsx    # Левая панель с историей чата
│       │   ├── ChatInput.tsx    # Поле ввода сообщений
│       │   ├── MessageBubble.tsx # Отдельное сообщение в чате
│       │   ├── ResultsPanel.tsx # Правая панель с результатами
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
│       │   ├── home.tsx         # Главная страница
│       │   └── not-found.tsx    # 404 страница
│       ├── App.tsx              # Root компонент
│       ├── index.css            # Tailwind + кастомные стили
│       └── main.tsx             # Entry point
│
├── server/                      # Backend приложение
│   ├── db.ts                    # PostgreSQL connection pool (Neon)
│   ├── db-utils.ts              # executeQuery, getDatabaseSchema
│   ├── storage.ts               # DatabaseStorage для сообщений
│   ├── openai-service.ts        # OpenAI интеграция + SQL валидация
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

## База данных

### Таблицы

#### employees (сотрудники)
| Поле | Тип | Описание |
|------|-----|----------|
| id | serial | PRIMARY KEY |
| name | text | Имя сотрудника |
| position | text | Должность |
| department | text | Отдел |
| salary | integer | Зарплата |
| hire_date | text | Дата найма |

#### products (продукты)
| Поле | Тип | Описание |
|------|-----|----------|
| id | serial | PRIMARY KEY |
| name | text | Название продукта |
| category | text | Категория |
| price | real | Цена |
| stock | integer | Количество на складе |
| supplier | text | Поставщик |

#### sales (продажи)
| Поле | Тип | Описание |
|------|-----|----------|
| id | serial | PRIMARY KEY |
| product_id | integer | FOREIGN KEY → products.id |
| quantity | integer | Количество |
| sale_date | text | Дата продажи |
| customer_name | text | Имя покупателя |
| total_amount | real | Общая сумма |

#### messages (история чата)
| Поле | Тип | Описание |
|------|-----|----------|
| id | text | PRIMARY KEY |
| role | text | Роль (user/assistant) |
| content | text | Содержание сообщения |
| sql_query | text | SQL запрос (опционально) |
| query_results | jsonb | Результаты запроса (опционально) |
| timestamp | bigint | Временная метка |
| error | text | Ошибка (опционально) |

## API Endpoints

### GET /api/messages
Получение истории чата.

**Ответ:**
```json
{
  "messages": [
    {
      "id": "msg-1234-user",
      "role": "user",
      "content": "Покажи всех сотрудников",
      "timestamp": 1699999999999
    }
  ]
}
```

### POST /api/chat
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

### POST /api/export
Экспорт результатов в Excel.

**Запрос:**
```json
{
  "columns": ["id", "name", "salary"],
  "rows": [{"id": 1, "name": "Иванов", "salary": 120000}],
  "filename": "results.xlsx"
}
```

**Ответ:** Binary Excel file (.xlsx)

## Безопасность SQL

- Валидация: только SELECT запросы разрешены
- Блокировка опасных ключевых слов:
  - DROP, DELETE, INSERT, UPDATE
  - ALTER, CREATE, EXEC, EXECUTE
- Удаление SQL комментариев из запросов
- Защита от SQL injection через validated queries

## Примеры запросов

| Естественный язык | SQL запрос |
|-------------------|------------|
| "Покажи всех сотрудников" | `SELECT * FROM employees;` |
| "Кто зарабатывает больше 100000?" | `SELECT * FROM employees WHERE salary > 100000;` |
| "Топ 5 самых дорогих продуктов" | `SELECT * FROM products ORDER BY price DESC LIMIT 5;` |
| "Сколько продаж в марте?" | `SELECT COUNT(*) FROM sales WHERE sale_date LIKE '2024-03%';` |
| "Общая сумма продаж по клиентам" | `SELECT customer_name, SUM(total_amount) FROM sales GROUP BY customer_name;` |

## Запуск проекта

### Development
```bash
npm run dev
```
Запускает Express сервер и Vite dev server на порту 5000.

### Production
```bash
npm run build
npm run start
```

### Database
```bash
npm run db:push    # Синхронизация схемы с базой данных
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| DATABASE_URL | PostgreSQL connection string |
| AI_INTEGRATIONS_OPENAI_BASE_URL | OpenAI API base URL |
| AI_INTEGRATIONS_OPENAI_API_KEY | OpenAI API key |

## Дизайн

Приложение использует **Material Design** систему:

- **Цветовая схема**: синий primary (#3B82F6), нейтральные grays
- **Типографика**: Inter (основной), JetBrains Mono (код)
- **Layout**: двухколоночный (чат + результаты)
- **Темы**: поддержка light/dark mode

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  ChatPanel  │    │ResultsPanel │    │  ExcelExport│     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                   │            │
│         └─────────────────┼───────────────────┘            │
│                           │                                 │
│                    TanStack Query                           │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Routes    │───▶│OpenAI Agent │───▶│  Validator  │     │
│  └──────┬──────┘    └─────────────┘    └──────┬──────┘     │
│         │                                      │            │
│         ▼                                      ▼            │
│  ┌─────────────┐                       ┌─────────────┐     │
│  │   Storage   │◀──────────────────────│  DB Utils   │     │
│  └──────┬──────┘                       └──────┬──────┘     │
└─────────┼─────────────────────────────────────┼─────────────┘
          │                                      │
          ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Neon)                         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │ employees │ │ products  │ │   sales   │ │ messages  │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Лицензия

MIT
