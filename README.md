# AI SQL Chat Bot

Веб-приложение с AI-агентом для преобразования запросов на естественном языке в SQL. Поддержка множества LLM-провайдеров и типов баз данных, экспорт в Excel/CSV, отправка отчётов в Telegram.

## Возможности

- **Естественный язык в SQL** — задавайте вопросы по-русски, получайте готовые SQL-запросы и результаты
- **Мультипользовательский режим** — регистрация, авторизация, изоляция данных между пользователями
- **Множественные чаты** — создание, переключение, удаление чатов с полной историей
- **Несколько LLM-провайдеров** — OpenAI API, Ollama (локальные модели), любой OpenAI-совместимый сервер
- **Несколько типов БД** — PostgreSQL, ClickHouse
- **Разделение БД** — системная БД (пользователи, чаты) отдельно от целевой БД для SQL-запросов
- **Экспорт** — Excel (.xlsx) и CSV с заголовком-описанием на русском языке и датой формирования
- **Telegram** — отправка отчётов с кратким описанием запроса (генерируется через LLM)
- **Визуализация** — столбчатые и линейные диаграммы (Chart.js)
- **Шаблоны запросов** — сохранение и повторное использование SQL-запросов
- **Безопасность** — только SELECT-запросы, блокировка деструктивных команд
- **Просмотр схемы БД** — диалог со списком таблиц и столбцов целевой базы

## Быстрый старт

### Docker (рекомендуется)

```bash
git clone <repo-url>
cd ai-sql-chatbot

# Скопируйте и настройте переменные окружения
cp .env.example .env
# Отредактируйте .env

# Запуск
docker-compose up -d
```

Приложение будет доступно на `http://localhost:5000`.

### Без Docker

```bash
npm install
cp .env.example .env
# Отредактируйте .env — укажите DATABASE_URL и настройки LLM

npm run db:push   # Применение схемы БД
npm run dev        # Разработка
# или
npm run build && npm start   # Production
```

Подробнее о развёртывании — в [DEPLOYMENT.md](DEPLOYMENT.md).

## Конфигурация

Все настройки задаются через переменные окружения.

### LLM-провайдер

| Переменная | Описание | По умолчанию |
|---|---|---|
| `LLM_PROVIDER` | Провайдер: `openai`, `ollama`, `custom` | `openai` |
| `LLM_TEMPERATURE` | Температура генерации | `0.1` |
| `LLM_MAX_TOKENS` | Максимум токенов ответа | `2048` |

#### OpenAI

| Переменная | Описание |
|---|---|
| `OPENAI_MODEL` | Модель (gpt-4, gpt-4o, gpt-5) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | URL API |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | API-ключ |

#### Ollama (локальные модели)

| Переменная | Описание | По умолчанию |
|---|---|---|
| `OLLAMA_BASE_URL` | URL сервера Ollama | `http://localhost:11434/v1` |
| `OLLAMA_MODEL` | Модель | `llama3.1` |

#### Custom API (OpenAI-совместимый)

| Переменная | Описание |
|---|---|
| `CUSTOM_LLM_BASE_URL` | URL сервера |
| `CUSTOM_LLM_API_KEY` | API-ключ |
| `CUSTOM_LLM_MODEL` | Модель |

### Базы данных

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Системная PostgreSQL (пользователи, чаты, сессии) |
| `DATABASE_TYPE` | Тип целевой БД: `postgresql` или `clickhouse` |
| `TARGET_DATABASE_URL` | Целевая БД для SQL-запросов (если не задан — DATABASE_URL) |
| `TARGET_PGDATABASE` | Имя целевой PostgreSQL БД |
| `CLICKHOUSE_URL` | URL ClickHouse (при DATABASE_TYPE=clickhouse) |
| `CLICKHOUSE_DATABASE` | Имя БД ClickHouse |
| `SESSION_SECRET` | Секрет для подписи сессий |

### Telegram

| Переменная | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота |
| `TELEGRAM_CHAT_ID` | ID чата/группы для отправки отчётов |

## Примеры конфигураций

### OpenAI + PostgreSQL

```env
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4o
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@host/systemdb
TARGET_DATABASE_URL=postgresql://user:pass@host/analyticsdb
```

### Ollama (локальная модель) + PostgreSQL

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@host/db
```

### Custom LLM + ClickHouse

```env
LLM_PROVIDER=custom
CUSTOM_LLM_BASE_URL=http://my-llm:8080/v1
CUSTOM_LLM_API_KEY=my-key
CUSTOM_LLM_MODEL=my-model
DATABASE_TYPE=clickhouse
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_DATABASE=analytics
DATABASE_URL=postgresql://user:pass@host/systemdb
```

## Архитектура

```
┌─────────────────────────────────────────────────┐
│                 Client (React)                   │
│  ┌───────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │ ChatPanel │ │ ResultsPanel │ │  Templates  │ │
│  │ ChatInput │ │ ChartView    │ │  Dialog     │ │
│  │ Messages  │ │ ResultsTable │ │             │ │
│  └───────────┘ └──────────────┘ └─────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │ HTTP API
┌──────────────────────▼──────────────────────────┐
│               Server (Express.js)                │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│  │  Routes    │ │ LLM Service│ │   Storage    │ │
│  │  Auth      │ │ (OpenAI SDK│ │  (Drizzle)   │ │
│  │  Export    │ │  Ollama    │ │              │ │
│  │  Telegram  │ │  Custom)   │ │              │ │
│  └────────────┘ └─────┬──────┘ └──────┬───────┘ │
└───────────────────────┼───────────────┼─────────┘
                        │               │
              ┌─────────▼──┐    ┌───────▼────────┐
              │ Target DB  │    │  System DB     │
              │ (PG / CH)  │    │  (PostgreSQL)  │
              │ SQL-запросы │    │  users, chats  │
              └────────────┘    └────────────────┘
```

### Файловая структура

```
├── server/
│   ├── index.ts                 # Express сервер, graceful shutdown
│   ├── routes.ts                # API-эндпоинты
│   ├── storage.ts               # Drizzle ORM хранилище
│   ├── db.ts                    # Подключение к системной БД
│   ├── seed.ts                  # Инициализация тестовых данных
│   ├── llm-config.ts            # Конфигурация LLM-провайдеров
│   ├── llm-service.ts           # Генерация SQL и заголовков через LLM
│   ├── vite.ts                  # Vite dev server middleware
│   └── database-adapters/
│       ├── base-adapter.ts      # Интерфейс DatabaseAdapter
│       ├── postgresql-adapter.ts # PostgreSQL (Neon Serverless)
│       ├── clickhouse-adapter.ts # ClickHouse HTTP API
│       └── index.ts             # Фабрика адаптеров
├── client/src/
│   ├── App.tsx                  # Корневой компонент, роутинг
│   ├── pages/
│   │   ├── home.tsx             # Сайдбар + чат + результаты
│   │   ├── auth.tsx             # Логин / регистрация
│   │   └── not-found.tsx        # 404
│   ├── components/
│   │   ├── ChatPanel.tsx        # Панель чата
│   │   ├── ChatInput.tsx        # Поле ввода
│   │   ├── MessageBubble.tsx    # Сообщение
│   │   ├── ResultsPanel.tsx     # Результаты + экспорт + шаблоны
│   │   ├── ResultsTable.tsx     # Таблица
│   │   ├── ChartView.tsx        # Диаграммы (Chart.js)
│   │   ├── EmptyState.tsx       # Пустое состояние
│   │   ├── SQLQueryDisplay.tsx  # SQL-запрос
│   │   └── TemplatesDialog.tsx  # Сохранённые шаблоны
│   ├── hooks/
│   │   ├── useAuth.ts           # Авторизация
│   │   └── use-toast.ts         # Уведомления
│   └── lib/
│       ├── queryClient.ts       # React Query
│       └── utils.ts             # Утилиты
├── shared/
│   └── schema.ts                # Drizzle-схема + типы
├── Dockerfile                   # Docker-образ
├── docker-compose.yml           # Docker Compose
├── DEPLOYMENT.md                # Инструкция по развёртыванию
└── README.md
```

## API

### Авторизация

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/register` | Регистрация |
| POST | `/api/login` | Вход |
| POST | `/api/logout` | Выход |
| GET | `/api/user` | Текущий пользователь |

### Чаты

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/chats` | Список чатов |
| POST | `/api/chats` | Создать чат |
| DELETE | `/api/chats/:chatId` | Удалить чат |

### Сообщения

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/chats/:chatId/messages` | История сообщений |
| POST | `/api/chats/:chatId/chat` | Отправить запрос -> SQL -> результат |

### Шаблоны

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/templates` | Список шаблонов |
| POST | `/api/templates` | Сохранить шаблон |
| DELETE | `/api/templates/:id` | Удалить шаблон |

### Экспорт и прочее

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/export?format=xlsx\|csv` | Скачать Excel или CSV |
| POST | `/api/send-telegram` | Отправить отчёт в Telegram |
| GET | `/api/config` | Конфигурация LLM и БД |
| GET | `/api/tables` | Таблицы и столбцы целевой БД |

## Безопасность

- Разрешены только `SELECT` и `WITH` запросы
- Блокируются: `DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `CREATE`, `TRUNCATE`, `EXEC`
- SQL-комментарии удаляются перед валидацией
- Мультистейтмент-запросы проверяются поштучно
- Пароли хешируются (bcrypt)
- Сессии в PostgreSQL (connect-pg-simple)
- Системные таблицы скрыты из списка таблиц

## Стек

| Компонент | Технология |
|---|---|
| Frontend | React 18, TanStack Query, Tailwind CSS, shadcn/ui, Chart.js |
| Backend | Express.js, TypeScript, Drizzle ORM |
| LLM | OpenAI SDK (совместимость с Ollama и другими) |
| Системная БД | PostgreSQL (Neon Serverless) |
| Целевая БД | PostgreSQL / ClickHouse |
| Экспорт | ExcelJS, CSV |
| Авторизация | express-session, bcrypt, connect-pg-simple |

## Лицензия

MIT
