# AI SQL Chat Bot

## Обзор проекта
Веб-приложение чат-бота с AI агентом для преобразования текстовых запросов на естественном языке в SQL запросы и экспорта результатов в Excel файлы.

## Текущее состояние
Дата: 18 ноября 2025
- ✅ Frontend: Все компоненты созданы с дизайном согласно design_guidelines.md
- ✅ Backend: API endpoints, PostgreSQL база, OpenAI интеграция
- ✅ Database: Миграция на PostgreSQL завершена (Neon + Drizzle ORM)
- ✅ Integration: Полностью завершено и протестировано
- ✅ Testing: End-to-end тесты пройдены успешно
- **Статус: ГОТОВ К PRODUCTION**

## Функциональность

### Реализовано
1. **Чат-интерфейс**
   - Двухколоночный layout (чат слева, результаты справа)
   - История сообщений с отметками времени
   - Поддержка ролей: user, assistant
   - Empty state с примерами запросов
   - Loading states при отправке запросов

2. **AI агент на базе OpenAI**
   - Использует GPT-5 через Replit AI Integrations
   - Преобразование текста в SQL запросы
   - Объяснение сгенерированных запросов на русском
   - Retry логика с exponential backoff

3. **PostgreSQL база данных (Neon)**
   - Таблица employees (8 записей)
   - Таблица products (8 записей)
   - Таблица sales (8 записей)
   - Таблица messages для персистентности истории чата
   - Drizzle ORM для type-safe операций
   - Автоматическая инициализация с примерными данными
   - История сообщений сохраняется между перезапусками
   - Connection pooling с graceful shutdown

4. **Результаты и экспорт**
   - Таблица результатов с sticky header
   - Отображение SQL запроса в monospace шрифте
   - Статистика: количество строк, время выполнения
   - Экспорт в Excel (.xlsx) с прямым скачиванием файла
   - Правильная сериализация Date/BigInt в результатах

### API Endpoints
- `GET /api/messages` - получение истории чата из PostgreSQL
- `POST /api/chat` - отправка сообщения, генерация SQL, выполнение запроса через PostgreSQL, возврат полного Message объекта
- `POST /api/export` - создание и streaming Excel файла (.xlsx) напрямую клиенту

## Архитектура

### Frontend Stack
- React 18 с TypeScript
- Wouter для роутинга
- TanStack Query для state management
- Shadcn UI компоненты
- Tailwind CSS для стилей
- Шрифты: Inter (основной), JetBrains Mono (код)

### Backend Stack
- Express.js
- PostgreSQL (Neon) для базы данных
- Drizzle ORM для type-safe database операций
- OpenAI SDK с Replit AI Integrations
- ExcelJS для генерации Excel файлов
- p-retry для retry логики

### Файловая структура
```
client/src/
  components/
    ChatPanel.tsx - панель чата
    MessageBubble.tsx - сообщение в чате
    ChatInput.tsx - поле ввода
    ResultsPanel.tsx - панель результатов
    ResultsTable.tsx - таблица результатов
    EmptyState.tsx - пустое состояние
    SQLQueryDisplay.tsx - отображение SQL
  pages/
    home.tsx - главная страница

server/
  db.ts - Neon PostgreSQL connection pool
  db-utils.ts - executeQuery и getDatabaseSchema
  openai-service.ts - OpenAI интеграция с валидацией SQL
  routes.ts - API endpoints
  storage.ts - DatabaseStorage для персистентности сообщений
  seed.ts - Скрипт инициализации данных

shared/
  schema.ts - общие типы и Zod схемы
```

## Дизайн

### Цветовая схема
- Primary: синий (#3B82F6) для акцентов
- Background: белый/темно-серый в light/dark mode
- Card: слегка приподнятый фон для панелей
- Muted: для второстепенного текста

### Компоненты
- Сообщения пользователя: справа, синий фон
- Сообщения бота: слева, серый фон
- SQL запросы: monospace шрифт, подсвеченный фон
- Таблицы: hover states, четкие границы
- Кнопки: primary для основных действий, ghost для второстепенных

## Зависимости

### NPM пакеты
- openai - OpenAI SDK
- @neondatabase/serverless - PostgreSQL Neon driver
- drizzle-orm - Type-safe ORM
- drizzle-kit - Database toolkit
- exceljs - генерация Excel
- p-limit, p-retry - rate limiting и retries
- + стандартные React, TanStack Query, Shadcn UI

### Переменные окружения
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - автоматически через Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_API_KEY` - автоматически через Replit AI Integrations
- `DATABASE_URL` - автоматически через Replit PostgreSQL интеграцию

## Завершенные этапы
1. ✅ Phase 1: Schema & Frontend - полностью реализовано
2. ✅ Phase 2: Backend - полностью реализовано
3. ✅ Phase 3: Integration & Testing - полностью завершено
   - ✅ Workflow запущен и работает стабильно
   - ✅ Все endpoints протестированы
   - ✅ E2E тесты пройдены (chat → SQL → results → export)
   - ✅ Architect review passed
   - ✅ История персистентна между перезапусками
4. ✅ Phase 4: PostgreSQL Migration - полностью завершено (18 ноября 2025)
   - ✅ Drizzle ORM schema для всех таблиц
   - ✅ Neon PostgreSQL connection pooling
   - ✅ Async operations с proper error handling
   - ✅ Graceful shutdown для корректного закрытия пула
   - ✅ Seed script для инициализации данных
   - ✅ Критический bug fix: response.json() парсинг в ChatInput
   - ✅ E2E тесты пройдены после миграции

## Безопасность SQL
- Валидация OpenAI ответов (только SELECT запросы)
- Блокировка опасных keywords (DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, EXEC)
- Удаление комментариев из SQL
- Защита от SQL injection через validated queries

## Готовность к Production
Приложение полностью готово к публикации (deploy):
- Все функции работают корректно
- Персистентность данных обеспечена
- SQL безопасность на уровне MVP
- UX протестирован и отполирован
- Нет критических bugs
