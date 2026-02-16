# Технический отчёт: AI SQL Chat Bot

## 1. Общее описание проекта

**AI SQL Chat Bot** — веб-приложение корпоративного класса, предназначенное для преобразования запросов на естественном языке (русском и английском) в SQL-запросы с помощью больших языковых моделей (LLM). Приложение позволяет бизнес-пользователям без знания SQL получать аналитические данные из баз данных через интуитивный чат-интерфейс.

### 1.1 Назначение

Система решает задачу демократизации доступа к данным: менеджеры, аналитики и другие сотрудники без технического бэкграунда могут задавать вопросы к базе данных на естественном языке и получать структурированные результаты с возможностью визуализации, экспорта и отправки коллегам.

### 1.2 Целевая аудитория

- Бизнес-аналитики, нуждающиеся в оперативном доступе к данным
- Менеджеры, принимающие решения на основе данных
- IT-отделы, предоставляющие безопасный доступ к БД для нетехнических сотрудников

### 1.3 Ключевые возможности

| Возможность | Описание |
|---|---|
| Генерация SQL из текста | Преобразование вопросов на естественном языке в корректные SQL-запросы |
| Мульти-LLM поддержка | OpenAI API, Ollama (локальные модели), Custom OpenAI-совместимые API |
| Мульти-БД поддержка | PostgreSQL и ClickHouse с адаптивной генерацией SQL |
| Экспорт данных | Excel (.xlsx) и CSV с LLM-генерируемыми заголовками на русском языке |
| Визуализация | Столбчатые и линейные диаграммы Chart.js |
| Telegram-интеграция | Отправка отчётов с описанием через Telegram Bot API |
| Мультипользовательский режим | Регистрация/аутентификация, изоляция данных между пользователями |
| SQL-шаблоны | Сохранение и повторное использование часто используемых запросов |
| Просмотр схемы БД | Интерактивный просмотр таблиц и колонок целевой базы данных |
| Безопасность SQL | Whitelist-валидация (только SELECT/WITH), блокировка деструктивных операций |

---

## 2. Архитектура приложения

### 2.1 Общая архитектура

Приложение построено по архитектуре **монолитного full-stack приложения** с чётким разделением на серверную и клиентскую части, объединённых единым TypeScript-стеком.

```
┌─────────────────────────────────────────────────────────┐
│                    Клиент (React SPA)                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ ChatPanel│  │ Results  │  │ Templates │  │  Auth  │ │
│  │          │  │ Panel    │  │ Dialog    │  │  Page  │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───┬────┘ │
│       │             │              │             │       │
│  ┌────┴─────────────┴──────────────┴─────────────┴────┐ │
│  │           TanStack React Query + Fetch API          │ │
│  └─────────────────────┬───────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────┘
                         │ HTTP REST API
┌────────────────────────┼─────────────────────────────────┐
│                   Сервер (Express.js)                     │
│  ┌─────────────────────┴───────────────────────────────┐ │
│  │                   routes.ts (API)                    │ │
│  │  Auth │ Chats │ Messages │ Templates │ Export │ TG   │ │
│  └──┬──────┬──────────┬──────────┬──────────┬──────────┘ │
│     │      │          │          │          │             │
│  ┌──┴──┐ ┌─┴────┐ ┌──┴────┐ ┌──┴────┐ ┌──┴──────────┐ │
│  │stor-│ │LLM   │ │DB     │ │Excel- │ │Telegram     │ │
│  │age  │ │Serv- │ │Adap-  │ │JS /   │ │Bot API      │ │
│  │.ts  │ │ice   │ │ters   │ │CSV    │ │             │ │
│  └──┬──┘ └──┬───┘ └──┬────┘ └───────┘ └─────────────┘ │
│     │       │        │                                   │
│  ┌──┴──┐ ┌──┴────┐ ┌─┴─────────────────┐               │
│  │Driz-│ │OpenAI │ │  ┌──────┐ ┌─────┐ │               │
│  │zle  │ │SDK    │ │  │Pg    │ │CH   │ │               │
│  │ORM  │ │       │ │  │Adapt.│ │Adapt│ │               │
│  └──┬──┘ └──┬───┘  │  └──┬───┘ └──┬──┘ │               │
└─────┼───────┼───────┼─────┼────────┼────┼────────────────┘
      │       │       │     │        │
      ▼       ▼       ▼     ▼        ▼
  Системная  LLM    Целевая БД    ClickHouse
  БД (Neon   Provider (PostgreSQL   (HTTP API)
  PostgreSQL) (OpenAI/  или та же
              Ollama/   системная)
              Custom)
```

### 2.2 Паттерн разделения баз данных

Ключевое архитектурное решение — **разделение системной и целевой баз данных**:

| Компонент | Описание | Технология |
|---|---|---|
| **Системная БД** | Хранение пользователей, чатов, сообщений, сессий, шаблонов | PostgreSQL (Neon Serverless), фиксирована |
| **Целевая БД** | База данных для выполнения SQL-запросов пользователей | PostgreSQL или ClickHouse, настраивается |

Это разделение обеспечивает:
- **Безопасность**: пользовательские SQL-запросы не могут повредить системные таблицы
- **Гибкость**: целевая БД может быть любого поддерживаемого типа на любом сервере
- **Масштабируемость**: системная и аналитическая нагрузки изолированы

Если `TARGET_DATABASE_URL` не задан, система использует `DATABASE_URL` как для системных, так и для пользовательских запросов (с фильтрацией системных таблиц).

### 2.3 Паттерн Database Adapter (Strategy)

Для поддержки множества типов баз данных применён паттерн **Strategy** через систему адаптеров:

```
DatabaseAdapter (interface)
    ├── connect(): Promise<void>
    ├── disconnect(): Promise<void>
    ├── executeQuery(query): Promise<QueryResult>
    ├── getSchema(): Promise<string>
    ├── getTables(): Promise<TableInfo[]>
    └── isConnected(): boolean

BaseDatabaseAdapter (abstract class)
    ├── Реализация getSchema() — генерация описания схемы для LLM
    ├── Реализация isConnected()
    └── Абстрактные методы: connect, disconnect, executeQuery, getTables

PostgreSQLAdapter extends BaseDatabaseAdapter
    ├── Использует @neondatabase/serverless Pool
    ├── getTables() — information_schema с фильтрацией системных таблиц
    └── executeQuery() — прямое выполнение через pool.query()

ClickHouseAdapter extends BaseDatabaseAdapter
    ├── Использует HTTP API (fetch)
    ├── Авторизация через Basic Auth
    ├── getTables() — system.tables / system.columns
    └── executeQuery() — POST запрос с FORMAT JSON
```

**Фабричный метод** `createDatabaseAdapter()` создаёт нужный адаптер по типу БД. Синглтон-паттерн через `getActiveAdapter()` обеспечивает переиспользование подключения.

### 2.4 Паттерн LLM Provider (Strategy)

Аналогичный паттерн используется для LLM-провайдеров. Все провайдеры работают через единый **OpenAI SDK**, так как Ollama и большинство кастомных серверов поддерживают OpenAI-совместимый API:

```
LLMConfig
    ├── provider: "openai" | "ollama" | "custom"
    ├── model: string
    ├── baseUrl: string
    ├── apiKey: string
    ├── temperature: number (0.0–2.0)
    └── maxTokens: number

getLLMConfig(): LLMConfig
    ├── openai  → AI_INTEGRATIONS_OPENAI_BASE_URL + API_KEY + OPENAI_MODEL
    ├── ollama  → OLLAMA_BASE_URL (/v1) + OLLAMA_MODEL, apiKey="ollama"
    └── custom  → CUSTOM_LLM_BASE_URL + CUSTOM_LLM_API_KEY + CUSTOM_LLM_MODEL
```

**Обоснование выбора**: OpenAI SDK v6 обеспечивает единый интерфейс для всех трёх провайдеров, устраняя необходимость в отдельных HTTP-клиентах. Для Ollama используется apiKey="ollama" как заглушка (Ollama не требует ключа).

---

## 3. Схема базы данных

### 3.1 ER-диаграмма

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    users     │     │    chats     │     │    messages       │
├──────────────┤     ├──────────────┤     ├──────────────────┤
│ id (PK,serial)│◄───│ user_id (FK) │     │ id (PK, text)    │
│ username     │     │ id (PK,text) │◄────│ chat_id (FK)     │
│ password_hash│     │ title        │     │ role             │
│ created_at   │     │ created_at   │     │ content          │
└──────┬───────┘     │ updated_at   │     │ sql_query        │
       │             └──────────────┘     │ query_results    │
       │                                  │ timestamp        │
       │             ┌──────────────┐     │ error            │
       └────────────►│sql_templates │     └──────────────────┘
                     ├──────────────┤
                     │ id (PK,serial)│
                     │ user_id (FK) │
                     │ name         │
                     │ sql_query    │
                     │ description  │
                     │ created_at   │
                     └──────────────┘

Целевые таблицы (демо-данные):

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  employees   │     │  products    │     │    sales     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │◄────│ product_id   │
│ name         │     │ name         │     │ id (PK)      │
│ position     │     │ category     │     │ quantity     │
│ department   │     │ price (real) │     │ sale_date    │
│ salary (int) │     │ stock (int)  │     │ customer_name│
│ hire_date    │     │ supplier     │     │ total_amount │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 3.2 Описание таблиц

#### Системные таблицы

**users** — Пользователи системы

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| id | serial | PK, autoincrement | Уникальный идентификатор |
| username | text | NOT NULL, UNIQUE | Логин пользователя |
| password_hash | text | NOT NULL | bcrypt-хеш пароля (cost factor 10) |
| created_at | bigint | NOT NULL | Timestamp создания (Unix ms) |

**chats** — Чаты (сессии диалога)

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| id | text | PK | UUID-подобный идентификатор (`chat-{timestamp}`) |
| title | text | NOT NULL | Заголовок чата (автообновление из первого сообщения) |
| user_id | integer | FK → users.id, ON DELETE CASCADE | Владелец чата |
| created_at | bigint | NOT NULL | Timestamp создания |
| updated_at | bigint | NOT NULL | Timestamp последнего обновления |

**messages** — Сообщения в чатах

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| id | text | PK | UUID-подобный идентификатор (`msg-{timestamp}-{role}`) |
| chat_id | text | FK → chats.id, ON DELETE CASCADE | Привязка к чату |
| role | text | NOT NULL | Роль: `user`, `assistant`, `system` |
| content | text | NOT NULL | Текст сообщения / объяснение от LLM |
| sql_query | text | nullable | Сгенерированный SQL-запрос |
| query_results | jsonb | nullable | Результаты выполнения запроса (JSON) |
| timestamp | bigint | NOT NULL | Timestamp сообщения |
| error | text | nullable | Текст ошибки (если была) |

Структура `query_results` (JSONB):
```json
{
  "columns": ["col1", "col2"],
  "rows": [{"col1": "val1", "col2": 123}],
  "rowCount": 1,
  "executionTime": 45.2
}
```

**sql_templates** — Шаблоны SQL-запросов

| Колонка | Тип | Ограничения | Описание |
|---|---|---|---|
| id | serial | PK, autoincrement | Уникальный идентификатор |
| user_id | integer | FK → users.id, ON DELETE CASCADE | Владелец шаблона |
| name | text | NOT NULL | Название шаблона |
| sql_query | text | NOT NULL | SQL-запрос |
| description | text | nullable | Описание шаблона |
| created_at | bigint | NOT NULL | Timestamp создания |

**session** — Серверные сессии (создаётся автоматически connect-pg-simple)

| Колонка | Тип | Описание |
|---|---|---|
| sid | varchar | Session ID (PK) |
| sess | json | Данные сессии (userId, username) |
| expire | timestamp | Время истечения сессии |

#### Целевые таблицы (демо-данные)

**employees** — Сотрудники (демо)

| Колонка | Тип | Описание |
|---|---|---|
| id | serial (PK) | ID сотрудника |
| name | text | ФИО сотрудника |
| position | text | Должность |
| department | text | Отдел |
| salary | integer | Зарплата (руб.) |
| hire_date | text | Дата приёма (YYYY-MM-DD) |

**products** — Товары (демо)

| Колонка | Тип | Описание |
|---|---|---|
| id | serial (PK) | ID товара |
| name | text | Наименование |
| category | text | Категория |
| price | real | Цена (руб.) |
| stock | integer | Остаток на складе |
| supplier | text | Поставщик |

**sales** — Продажи (демо)

| Колонка | Тип | Описание |
|---|---|---|
| id | serial (PK) | ID продажи |
| product_id | integer (FK → products.id) | Товар |
| quantity | integer | Количество |
| sale_date | text | Дата продажи |
| customer_name | text | Покупатель |
| total_amount | real | Сумма (руб.) |

### 3.3 Каскадное удаление

При удалении пользователя (`users`) автоматически удаляются:
- Все его чаты (`chats` → ON DELETE CASCADE)
- Все сообщения в его чатах (`messages` → ON DELETE CASCADE по `chat_id`)
- Все его шаблоны (`sql_templates` → ON DELETE CASCADE)

При удалении чата автоматически удаляются все его сообщения.

---

## 4. Стек технологий и обоснование выбора

### 4.1 Серверная часть

| Технология | Версия | Назначение | Обоснование |
|---|---|---|---|
| **Node.js** | 20 LTS | Runtime | Стабильная LTS-версия, широкая экосистема, нативная поддержка ESM |
| **TypeScript** | 5.6.3 | Язык | Строгая типизация, единый язык для frontend и backend, рефакторинг-безопасность |
| **Express.js** | 4.21 | HTTP-фреймворк | Минимализм, гибкость, зрелая экосистема middleware |
| **Drizzle ORM** | 0.39 | ORM для системной БД | Type-safe запросы, лёгкий overhead, поддержка Neon Serverless |
| **@neondatabase/serverless** | 0.10 | PostgreSQL-драйвер | WebSocket-подключение к Neon, connection pooling |
| **OpenAI SDK** | 6.9 | LLM-клиент | Универсальный SDK для всех OpenAI-совместимых API (включая Ollama) |
| **ExcelJS** | 4.4 | Генерация Excel | Форматирование ячеек, merge, стили — полный контроль над .xlsx |
| **bcrypt** | 6.0 | Хеширование паролей | Adaptive cost factor, стандарт индустрии |
| **connect-pg-simple** | 10.0 | Хранение сессий | Сессии в PostgreSQL, без отдельного Redis |
| **express-session** | 1.19 | Управление сессиями | Server-side sessions с cookie, httpOnly, sameSite |
| **p-retry** | 7.1 | Retry-логика для LLM | Экспоненциальный backoff при rate limit (429) |
| **Zod** | 3.24 | Валидация данных | Runtime-валидация запросов, интеграция с Drizzle (drizzle-zod) |
| **tsx** | 4.20 | TypeScript runtime | Быстрое выполнение TS без предварительной компиляции (dev-режим) |
| **esbuild** | 0.25 | Bundler (production) | Сверхбыстрая сборка серверного кода в один файл |

### 4.2 Клиентская часть

| Технология | Версия | Назначение | Обоснование |
|---|---|---|---|
| **React** | 18.3 | UI-фреймворк | Компонентная модель, декларативный UI, огромная экосистема |
| **Vite** | 5.4 | Build tool / Dev server | Мгновенный HMR, ESM-based, быстрая сборка |
| **TanStack React Query** | 5.60 | Управление серверным состоянием | Кеширование, фоновая синхронизация, оптимистичные обновления |
| **wouter** | 3.3 | Маршрутизация | Легковесная альтернатива React Router (< 2KB) |
| **Tailwind CSS** | 3.4 | Стилизация | Utility-first подход, консистентный дизайн, тёмная тема |
| **shadcn/ui** | — | Компоненты UI | Unstyled + Tailwind, полный контроль, Radix UI примитивы |
| **Chart.js** | 4.5 | Визуализация данных | Лёгкий, Canvas-based, множество типов графиков |
| **react-chartjs-2** | 5.3 | React-обёртка Chart.js | Декларативные чарты в React-компонентах |
| **Lucide React** | 0.453 | Иконки | Консистентный набор SVG-иконок, tree-shakeable |
| **react-hook-form** | 7.55 | Формы | Производительные формы с минимальными ре-рендерами |
| **react-resizable-panels** | 2.1 | Resizable-панели | Drag-resize для чат/результаты панелей |

### 4.3 Инфраструктура

| Технология | Назначение | Обоснование |
|---|---|---|
| **Docker** | Контейнеризация | Воспроизводимые сборки, изоляция окружения |
| **Docker Compose** | Оркестрация | Декларативное управление multi-service стеком |
| **Drizzle Kit** | Миграции БД | Автоматический push схемы, type-safe миграции |
| **Nginx** | Reverse proxy (prod) | SSL-терминация, статические файлы, load balancing |

### 4.4 Обоснование ключевых решений

**Почему OpenAI SDK для всех LLM-провайдеров?**
Ollama и большинство OpenAI-совместимых серверов (LocalAI, vLLM, LM Studio) предоставляют endpoint `/v1/chat/completions`. OpenAI SDK позволяет настроить `baseURL` и использовать единый код для всех провайдеров, устраняя дублирование.

**Почему Drizzle ORM, а не Prisma?**
Drizzle ORM обеспечивает меньший overhead, нативную совместимость с Neon Serverless (WebSocket), type-safe запросы без codegen, и прямой контроль над SQL. Prisma требует отдельного клиента и тяжелее для serverless-окружений.

**Почему серверные сессии, а не JWT?**
Для корпоративного приложения серверные сессии безопаснее: возможность немедленного отзыва, хранение минимальных данных в cookie (только session ID), отсутствие проблемы с размером токена. Хранение сессий в PostgreSQL (connect-pg-simple) устраняет необходимость в Redis.

**Почему connect-pg-simple, а не Redis для сессий?**
Упрощение инфраструктуры: для корпоративного приложения с небольшим числом одновременных пользователей PostgreSQL-хранилище сессий достаточно производительно и не требует дополнительного сервиса.

**Почему ExcelJS, а не xlsx?**
ExcelJS предоставляет полный контроль над форматированием: merge ячеек, стили шрифтов, заливка, что необходимо для создания структурированных отчётов с заголовками.

---

## 5. API-спецификация

### 5.1 Аутентификация

Все защищённые эндпоинты требуют наличия серверной сессии (cookie `connect.sid`). Middleware `requireAuth` проверяет `req.session.userId`.

#### POST /api/auth/register

Регистрация нового пользователя.

**Request Body:**
```json
{
  "username": "string (min 2 символа)",
  "password": "string (min 4 символа)"
}
```

**Response 200:**
```json
{
  "id": 1,
  "username": "user1"
}
```

**Ошибки:**
- `400` — Пользователь с таким именем уже существует / Ошибка валидации
- `500` — Внутренняя ошибка

#### POST /api/auth/login

Вход в систему.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response 200:**
```json
{
  "id": 1,
  "username": "user1"
}
```

**Ошибки:**
- `401` — Неверное имя пользователя или пароль

#### POST /api/auth/logout

Выход из системы. Уничтожает серверную сессию.

**Response 200:**
```json
{ "success": true }
```

#### GET /api/auth/me

Проверка текущей авторизации.

**Response 200:**
```json
{
  "id": 1,
  "username": "user1"
}
```

**Response 401:**
```json
{ "error": "Не авторизован" }
```

### 5.2 Управление чатами

#### GET /api/chats

Получение списка чатов текущего пользователя. Сортировка по `updated_at` DESC.

**Response 200:**
```json
{
  "chats": [
    {
      "id": "chat-1707000000000",
      "title": "Зарплаты сотрудников",
      "userId": 1,
      "createdAt": 1707000000000,
      "updatedAt": 1707000060000
    }
  ]
}
```

#### POST /api/chats

Создание нового чата. Заголовок по умолчанию: "Новый чат".

**Response 200:**
```json
{
  "id": "chat-1707000000000",
  "title": "Новый чат",
  "userId": 1,
  "createdAt": 1707000000000,
  "updatedAt": 1707000000000
}
```

#### DELETE /api/chats/:chatId

Удаление чата и всех его сообщений (CASCADE). Проверка владельца.

**Response 200:**
```json
{ "success": true }
```

**Ошибки:**
- `404` — Чат не найден или принадлежит другому пользователю

### 5.3 Сообщения и SQL-генерация

#### GET /api/chats/:chatId/messages

Получение истории сообщений чата. Сортировка по `timestamp` ASC. Проверка владельца.

**Response 200:**
```json
{
  "messages": [
    {
      "id": "msg-1707000000000-user",
      "chatId": "chat-1707000000000",
      "role": "user",
      "content": "Покажи топ-5 сотрудников по зарплате",
      "sqlQuery": null,
      "queryResults": null,
      "timestamp": 1707000000000,
      "error": null
    },
    {
      "id": "msg-1707000001000-assistant",
      "chatId": "chat-1707000000000",
      "role": "assistant",
      "content": "Запрос выбирает 5 сотрудников с наибольшей зарплатой",
      "sqlQuery": "SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 5",
      "queryResults": {
        "columns": ["name", "salary"],
        "rows": [{"name": "Николаев Алексей", "salary": 150000}],
        "rowCount": 5,
        "executionTime": 12.5
      },
      "timestamp": 1707000001000,
      "error": null
    }
  ]
}
```

#### POST /api/chats/:chatId/chat

Основной эндпоинт: отправка сообщения → генерация SQL → выполнение → ответ.

**Поток обработки:**
1. Валидация сообщения (Zod `chatRequestSchema`)
2. Сохранение пользовательского сообщения в БД
3. Автообновление заголовка чата (если "Новый чат" → первые 30 символов сообщения)
4. Получение схемы целевой БД через адаптер
5. Генерация SQL через LLM (с retry при rate limit)
6. Валидация SQL (только SELECT/WITH, блокировка деструктивных)
7. Выполнение SQL через адаптер целевой БД
8. Сериализация результатов (Date → ISO, BigInt → string)
9. Сохранение ответа ассистента в БД
10. Возврат ответа клиенту

**Request Body:**
```json
{
  "message": "Покажи средню зарплату по отделам"
}
```

**Response 200 (успех):**
```json
{
  "id": "msg-1707000001000-assistant",
  "chatId": "chat-1707000000000",
  "role": "assistant",
  "content": "Запрос группирует сотрудников по отделам и считает среднюю зарплату",
  "sqlQuery": "SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department",
  "queryResults": {
    "columns": ["department", "avg_salary"],
    "rows": [{"department": "IT", "avg_salary": 126666}],
    "rowCount": 5,
    "executionTime": 8.3
  },
  "timestamp": 1707000001000,
  "error": null
}
```

**Response 200 (ошибка SQL):**
```json
{
  "id": "msg-1707000001000-assistant",
  "role": "assistant",
  "content": "Ошибка выполнения SQL: column \"salary\" does not exist",
  "sqlQuery": "SELECT salary FROM nonexistent",
  "queryResults": null,
  "error": "Ошибка выполнения SQL: ..."
}
```

### 5.4 SQL-шаблоны

#### GET /api/templates

Получение списка шаблонов текущего пользователя. Сортировка по `created_at` DESC.

**Response 200:**
```json
{
  "templates": [
    {
      "id": 1,
      "userId": 1,
      "name": "Топ-5 по зарплате",
      "sqlQuery": "SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 5",
      "description": "Сотрудники с наибольшей зарплатой",
      "createdAt": 1707000000000
    }
  ]
}
```

#### POST /api/templates

Создание шаблона.

**Request Body:**
```json
{
  "name": "string (обязательно)",
  "sqlQuery": "string (обязательно)",
  "description": "string (опционально)"
}
```

#### DELETE /api/templates/:id

Удаление шаблона. Проверка владельца.

### 5.5 Экспорт данных

#### POST /api/export?format=xlsx|csv

Экспорт данных в файл.

**Поток обработки:**
1. Валидация данных (Zod `exportRequestSchema`)
2. Генерация заголовка через LLM (`generateSQLTitle`)
3. Формирование файла:
   - **XLSX**: Строка 1 — LLM-заголовок (merged, centered, bold 14pt), строка 2 — дата, строка 4+ — данные. При подходящих данных — дополнительный лист "Chart Data" с инструкцией.
   - **CSV**: BOM (UTF-8), строка 1 — заголовок, строка 2 — дата, строка 4+ — данные
4. Возврат файла как attachment

**Request Body:**
```json
{
  "columns": ["name", "salary"],
  "rows": [{"name": "Иванов", "salary": 120000}],
  "filename": "report.xlsx",
  "sqlQuery": "SELECT name, salary FROM employees"
}
```

**Response**: Binary file (application/vnd.openxmlformats... или text/csv)

#### POST /api/send-telegram

Отправка отчёта в Telegram.

**Требуемые ENV**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

**Request Body:**
```json
{
  "columns": ["name", "salary"],
  "rows": [{"name": "Иванов", "salary": 120000}],
  "sqlQuery": "SELECT name, salary FROM employees",
  "format": "xlsx"
}
```

**Формат caption в Telegram:**
```
username
LLM-заголовок отчёта
Строк: 150
```

**Response 200:**
```json
{
  "success": true,
  "message": "Файл report_1707000000000.xlsx отправлен в Telegram"
}
```

### 5.6 Вспомогательные

#### GET /api/config

Текущая конфигурация (без секретов).

**Response 200:**
```json
{
  "llm": { "provider": "openai", "model": "gpt-5" },
  "database": { "type": "postgresql" }
}
```

#### GET /api/tables

Список таблиц и колонок целевой БД (с фильтрацией системных таблиц для PostgreSQL).

**Response 200:**
```json
{
  "tables": [
    {
      "name": "employees",
      "columns": [
        { "name": "id", "type": "integer", "nullable": false },
        { "name": "name", "type": "text", "nullable": false }
      ]
    }
  ]
}
```

---

## 6. Безопасность

### 6.1 SQL-инъекции и защита данных

**Многоуровневая защита SQL-запросов:**

1. **LLM System Prompt**: Инструктирует модель генерировать только SELECT-запросы
2. **Удаление SQL-комментариев**: `cleanQuery.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '')`
3. **Whitelist-валидация**: Каждый statement должен начинаться с `SELECT` или `WITH`
4. **Blacklist-проверка**: Блокировка ключевых слов `DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `CREATE`, `EXEC`, `EXECUTE`, `TRUNCATE`
5. **Multi-statement detection**: Разбиение по `;` и проверка каждого оператора отдельно
6. **Разделение БД**: Пользовательские запросы выполняются только к целевой БД

### 6.2 Аутентификация и сессии

| Аспект | Реализация |
|---|---|
| Хеширование паролей | bcrypt, cost factor 10 |
| Хранение сессий | PostgreSQL (connect-pg-simple), таблица `session` |
| Cookie | httpOnly: true, sameSite: 'lax', maxAge: 30 дней |
| Изоляция данных | Проверка `userId` для каждого запроса к чатам/шаблонам |
| Валидация входных данных | Zod-схемы для всех API-запросов |

### 6.3 Минимальные требования к учётным данным

- Имя пользователя: минимум 2 символа
- Пароль: минимум 4 символа
- Уникальность имени пользователя (UNIQUE constraint в БД)

---

## 7. Процесс генерации SQL

### 7.1 Полный цикл обработки запроса

```
Пользователь вводит текст
        │
        ▼
┌─────────────────────┐
│ 1. Валидация входа  │ Zod chatRequestSchema
│    (min 1 символ)   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 2. Сохранение       │ Сообщение пользователя → messages (role: "user")
│    в историю        │ Обновление заголовка чата
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 3. Получение схемы  │ adapter.getSchema() → описание таблиц
│    целевой БД       │ на русском для LLM
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 4. Генерация SQL    │ OpenAI Chat Completions API
│    через LLM        │ System prompt + user message
│                     │ response_format: json_object
│                     │ Retry: 5 попыток, exp. backoff
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 5. Парсинг ответа   │ Извлечение JSON: {sqlQuery, explanation}
│    LLM              │ Regex: /\{[\s\S]*\}/
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 6. Валидация SQL     │ Удаление комментариев
│                     │ Split по ";" → проверка каждого statement
│                     │ Whitelist: SELECT, WITH
│                     │ Blacklist: DROP, DELETE, INSERT, ...
└────────┬────────────┘
         │
    ┌────┴────┐
    │ Безопас.│  НЕТ → Возврат ошибки с объяснением
    │ запрос? │
    └────┬────┘
         │ ДА
         ▼
┌─────────────────────┐
│ 7. Выполнение SQL   │ adapter.executeQuery(sqlQuery)
│    в целевой БД     │ performance.now() для замера времени
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 8. Сериализация     │ Date → ISO string
│    результатов      │ BigInt → string
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 9. Сохранение       │ Сообщение ассистента → messages
│    ответа           │ (role: "assistant", sqlQuery, queryResults)
└────────┬────────────┘
         │
         ▼
    Ответ клиенту
```

### 7.2 System Prompt для LLM

Промпт адаптируется под тип базы данных:

- **PostgreSQL**: Инструкции по `DATE`, `TIMESTAMP`, `CURRENT_DATE`, `LOWER()`, `LIMIT n OFFSET m`
- **ClickHouse**: Инструкции по `toDate()`, `today()`, `countIf()`, `sumIf()`

Формат ответа: строгий JSON `{ "sqlQuery": "...", "explanation": "..." }`.

Для моделей GPT-5 используется параметр `max_completion_tokens` вместо `max_tokens`.
Для моделей не-Ollama включается `response_format: { type: "json_object" }` для гарантированного JSON-вывода.

### 7.3 Retry-стратегия

При ошибках rate limit (HTTP 429) используется p-retry с экспоненциальным backoff:

| Параметр | Значение |
|---|---|
| Максимум попыток | 5 |
| Минимальная задержка | 1 000 мс |
| Максимальная задержка | 30 000 мс |
| Фактор увеличения | 2x |

### 7.4 LLM-генерируемые заголовки

Функция `generateSQLTitle(sqlQuery)` генерирует краткое описание SQL-запроса на русском (5–10 слов) для:
- Заголовков в Excel/CSV-файлах
- Caption-текста в Telegram
- Fallback: "Отчёт" при недоступности LLM

---

## 8. Экспорт и интеграции

### 8.1 Excel-экспорт

Структура файла .xlsx:

| Строка | Содержимое | Форматирование |
|---|---|---|
| 1 | LLM-заголовок | Merged, centered, bold, 14pt |
| 2 | Дата и время | Merged, centered, bold, 14pt |
| 3 | (пустая) | — |
| 4 | Заголовки колонок | Bold, серый фон (#E0E0E0) |
| 5+ | Данные | Стандартное |

При подходящих данных (2+ строк, до 5 колонок, есть числовые и текстовые) создаётся дополнительный лист "Chart Data" с подготовленными данными для построения диаграммы.

### 8.2 CSV-экспорт

- BOM-маркер (U+FEFF) для корректного отображения кириллицы в Excel
- Формат полей: double-quote escaping
- Кодировка: UTF-8

### 8.3 Telegram-интеграция

**Механизм**: Telegram Bot API `sendDocument` с multipart/form-data.

**Формат отправки:**
1. Формирование файла (XLSX или CSV) в памяти (Buffer)
2. Создание FormData с document (Blob) и caption
3. POST-запрос к `https://api.telegram.org/bot{token}/sendDocument`

**Caption содержит**: имя пользователя, LLM-заголовок отчёта, количество строк.

---

## 9. Клиентская архитектура

### 9.1 Компонентная структура

```
App.tsx
  ├── AuthPage (если не авторизован)
  │     └── Формы логина/регистрации
  │
  └── Home (если авторизован)
        ├── Sidebar (hover-expandable)
        │     ├── Кнопка "Новый чат"
        │     └── Список чатов (с удалением)
        │
        ├── Header
        │     ├── Логотип + название
        │     ├── DatabaseTablesDialog — просмотр схемы БД
        │     ├── TemplatesDialog — управление шаблонами
        │     └── Пользователь + кнопка выхода
        │
        └── Main Content
              ├── ChatPanel
              │     ├── Список сообщений (MessageBubble)
              │     ├── SQLQueryDisplay (подсветка SQL)
              │     └── ChatInput (поле ввода)
              │
              └── ResultsPanel
                    ├── ResultsTable (таблица данных)
                    ├── ChartView (Chart.js визуализация)
                    ├── Кнопки экспорта (Excel, CSV)
                    ├── Кнопка Telegram
                    └── Кнопка сохранения шаблона
```

### 9.2 Управление состоянием

| Тип данных | Механизм | Обоснование |
|---|---|---|
| Серверные данные (чаты, сообщения, шаблоны) | TanStack React Query | Кеширование, фоновая синхронизация, инвалидация |
| Состояние авторизации | React Query (`/api/auth/me`, staleTime: Infinity) | Единый источник правды, оптимистичные обновления |
| Локальное UI-состояние (выбранный чат, результаты) | React useState | Мгновенная реактивность, нет необходимости в серверной синхронизации |
| Мутации (создание/удаление) | React Query useMutation + invalidateQueries | Автоматическая инвалидация кеша |

### 9.3 Стратегия кеширования

```
queryKey                            | staleTime | refetchOnMount | refetchOnWindowFocus
------------------------------------|-----------|----------------|---------------------
['/api/auth/me']                    | Infinity  | —              | —
['/api/chats']                      | default   | true           | false
['/api/chats', chatId, 'messages']  | default   | true           | false
['/api/templates']                  | default   | —              | —
['/api/tables']                     | —         | false (manual)  | —
```

---

## 10. Конфигурация и развёртывание

### 10.1 Переменные окружения

#### Обязательные

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string для системной БД |
| `SESSION_SECRET` | Секрет для подписи cookie сессий |

#### LLM-провайдер

| Переменная | По умолчанию | Описание |
|---|---|---|
| `LLM_PROVIDER` | `openai` | Провайдер: `openai`, `ollama`, `custom` |
| `LLM_TEMPERATURE` | `0.1` | Температура генерации (0.0–2.0) |
| `LLM_MAX_TOKENS` | `2048` | Максимальное количество токенов |

**OpenAI:**

| Переменная | По умолчанию | Описание |
|---|---|---|
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | `https://api.openai.com/v1` | Base URL API |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | — | API-ключ |
| `OPENAI_MODEL` | `gpt-5` | Модель |

**Ollama:**

| Переменная | По умолчанию | Описание |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | URL Ollama API |
| `OLLAMA_MODEL` | `llama3.1` | Модель |

**Custom:**

| Переменная | По умолчанию | Описание |
|---|---|---|
| `CUSTOM_LLM_BASE_URL` | — | Base URL API |
| `CUSTOM_LLM_API_KEY` | — | API-ключ |
| `CUSTOM_LLM_MODEL` | `gpt-4` | Модель |

#### База данных

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_TYPE` | `postgresql` | Тип целевой БД: `postgresql`, `clickhouse` |
| `TARGET_DATABASE_URL` | — | URL целевой PostgreSQL (если отдельная от системной) |
| `TARGET_PGDATABASE` | — | Имя целевой БД |
| `CLICKHOUSE_URL` | `http://localhost:8123` | URL ClickHouse HTTP API |
| `CLICKHOUSE_DATABASE` | `default` | Имя базы ClickHouse |

#### Telegram

| Переменная | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен бота (от @BotFather) |
| `TELEGRAM_CHAT_ID` | ID чата/группы для отправки |

### 10.2 Docker-развёртывание

**Multi-stage Dockerfile:**

| Этап | Base image | Назначение |
|---|---|---|
| builder | node:20-alpine | Установка зависимостей, сборка (Vite + esbuild) |
| runner | node:20-alpine | Продакшн-запуск (npm ci + dist/) |

**Команда запуска**: `npx drizzle-kit push && node dist/index.js`
(автоматическая миграция БД при старте контейнера)

### 10.3 Graceful Shutdown

Сервер обрабатывает SIGINT и SIGTERM:
1. Прекращение приёма новых подключений (`server.close()`)
2. Отключение от целевой БД (`disconnectAdapter()`)
3. Завершение процесса (`process.exit(0)`)

Защита от двойного вызова через флаг `isShuttingDown`.

---

## 11. Тестовые данные

### 11.1 Seed-данные (server/seed.ts)

Базовый seed при первом запуске:

| Таблица | Количество записей | Описание |
|---|---|---|
| employees | 8 | Сотрудники (русские ФИО, отделы IT/Продажи/HR/Маркетинг) |
| products | 8 | Товары (электроника, аксессуары, цены в рублях) |
| sales | 8 | Продажи (привязка к товарам, покупатели — юрлица/ИП) |

### 11.2 Дамп для деплоя (backup.sql)

Расширенный набор данных (300 000+ строк, ~20MB):

| Таблица | Записей | Описание |
|---|---|---|
| employees | 50 000 | Генерированные ФИО, 10 отделов, зарплаты 40K–250K руб. |
| products | 50 000 | 8 категорий, цены от 500 до 200 000 руб. |
| sales | 200 000 | Период 2023–2025, привязка к товарам и покупателям |

Дамп предназначен для демонстрации работы системы на реалистичных объёмах данных.

---

## 12. Файловая структура проекта

```
ai-sql-chatbot/
├── client/                          # Frontend (React + Vite)
│   └── src/
│       ├── App.tsx                  # Корневой компонент, маршрутизация, auth guard
│       ├── pages/
│       │   ├── home.tsx             # Главная страница (sidebar + chat + results)
│       │   ├── auth.tsx             # Страница логина/регистрации
│       │   └── not-found.tsx        # 404
│       ├── components/
│       │   ├── ChatPanel.tsx        # Панель чата (сообщения + ввод)
│       │   ├── ChatInput.tsx        # Поле ввода сообщения
│       │   ├── MessageBubble.tsx    # Компонент одного сообщения
│       │   ├── ResultsPanel.tsx     # Панель результатов (таблица + экспорт)
│       │   ├── ResultsTable.tsx     # Таблица данных
│       │   ├── ChartView.tsx        # Визуализация Chart.js
│       │   ├── EmptyState.tsx       # Пустое состояние
│       │   ├── SQLQueryDisplay.tsx  # Отображение SQL-кода
│       │   ├── TemplatesDialog.tsx  # Диалог управления шаблонами
│       │   └── ui/                  # shadcn/ui компоненты (Button, Card, Dialog...)
│       ├── hooks/
│       │   ├── useAuth.ts           # Хук авторизации (login, register, logout, user)
│       │   └── use-toast.ts         # Хук уведомлений
│       └── lib/
│           ├── queryClient.ts       # TanStack Query client + apiRequest helper
│           └── utils.ts             # Утилиты (cn для classNames)
│
├── server/                          # Backend (Express.js)
│   ├── index.ts                     # Точка входа, Express setup, graceful shutdown
│   ├── routes.ts                    # Все API-эндпоинты
│   ├── storage.ts                   # IStorage интерфейс + DatabaseStorage реализация
│   ├── db.ts                        # Drizzle ORM + Neon Pool подключение
│   ├── seed.ts                      # Начальные данные
│   ├── llm-config.ts               # Конфигурация LLM и DB из ENV
│   ├── llm-service.ts              # generateSQL() + generateSQLTitle()
│   ├── vite.ts                      # Vite dev middleware
│   └── database-adapters/
│       ├── base-adapter.ts          # Интерфейс DatabaseAdapter + BaseDatabaseAdapter
│       ├── postgresql-adapter.ts    # PostgreSQL адаптер (Neon Pool)
│       ├── clickhouse-adapter.ts    # ClickHouse адаптер (HTTP API)
│       └── index.ts                 # Фабрика адаптеров + синглтон
│
├── shared/
│   └── schema.ts                    # Drizzle схема, Zod-валидация, TypeScript типы
│
├── Dockerfile                       # Multi-stage Docker build
├── docker-compose.yml               # Docker Compose (app + postgres)
├── .env.example                     # Пример конфигурации
├── backup.sql                       # Дамп БД (50K employees, 50K products, 200K sales)
├── drizzle.config.ts                # Конфигурация Drizzle Kit
├── package.json                     # Зависимости и скрипты
├── tsconfig.json                    # TypeScript конфигурация
├── vite.config.ts                   # Vite конфигурация
├── README.md                        # Руководство пользователя
├── DEPLOYMENT.md                    # Инструкции по развёртыванию
└── PROJECT_REPORT.md                # Данный технический отчёт
```

---

## 13. Нефункциональные требования и характеристики

### 13.1 Производительность

| Метрика | Ожидаемое значение |
|---|---|
| Время ответа API (без LLM) | < 100 мс |
| Время генерации SQL (LLM) | 1–5 сек (зависит от провайдера) |
| Время выполнения SQL | Зависит от запроса и объёма данных |
| Максимальный размер экспорта | Ограничен RAM (ExcelJS in-memory) |
| Одновременные пользователи | 50+ (при PostgreSQL session store) |

### 13.2 Масштабируемость

- Горизонтальное масштабирование: несколько инстансов за Nginx с shared PostgreSQL
- Session store в PostgreSQL обеспечивает consistency между инстансами
- Stateless API (без in-memory state между запросами, кроме кеша адаптера)

### 13.3 Надёжность

| Аспект | Реализация |
|---|---|
| Retry при rate limit LLM | p-retry, 5 попыток, экспоненциальный backoff |
| Graceful shutdown | SIGINT/SIGTERM → закрытие сервера → disconnect адаптера |
| Fallback при недоступности LLM | generateSQLTitle → "Отчёт" |
| Каскадное удаление | ON DELETE CASCADE для всех зависимых таблиц |
| Автоматическая миграция | drizzle-kit push при старте Docker-контейнера |

### 13.4 Совместимость

| Аспект | Поддержка |
|---|---|
| Браузеры | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| Node.js | 20 LTS |
| PostgreSQL | 14+ |
| ClickHouse | 23+ |
| Docker | 20+ |
| Docker Compose | 2.0+ |

---

## 14. Известные ограничения

1. **Отсутствие потоковой генерации (streaming)**: LLM-ответ ожидается целиком, без потоковой передачи. Для больших запросов пользователь видит spinner до полного ответа.

2. **Один адаптер БД одновременно**: Система поддерживает подключение только к одной целевой БД. Переключение типа БД требует перезапуска сервера.

3. **Экспорт в памяти**: Excel-файлы формируются полностью в RAM. Для очень больших результатов (100K+ строк) возможно высокое потребление памяти.

4. **Отсутствие RBAC**: Все пользователи имеют одинаковые права. Нет ролевой модели (admin/viewer).

5. **Отсутствие rate limiting на API**: Нет встроенного ограничения на количество запросов от одного пользователя.

6. **Нет audit log**: Не ведётся журнал выполненных SQL-запросов для аудита безопасности (помимо хранения в чат-истории).

---

*Документ создан: 16 февраля 2026 г.*
*Версия приложения: 1.0.0*
*Статус: Production Ready*
