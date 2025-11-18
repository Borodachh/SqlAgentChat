# AI SQL Chat Bot

## Обзор проекта
Веб-приложение чат-бота с AI агентом для преобразования текстовых запросов на естественном языке в SQL запросы и экспорта результатов в Excel файлы.

## Текущее состояние
Дата: 18 ноября 2025
- ✅ Frontend: Все компоненты созданы с дизайном согласно design_guidelines.md
- ✅ Backend: API endpoints, SQLite база, OpenAI интеграция
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

3. **SQLite база данных**
   - Таблица employees (8 записей)
   - Таблица products (8 записей)
   - Таблица sales (8 записей)
   - Таблица messages для персистентности истории чата
   - Автоматическая инициализация с примерными данными
   - История сообщений сохраняется между перезапусками

4. **Результаты и экспорт**
   - Таблица результатов с sticky header
   - Отображение SQL запроса в monospace шрифте
   - Статистика: количество строк, время выполнения
   - Экспорт в Excel (.xlsx) с прямым скачиванием файла
   - Правильная сериализация Date/BigInt в результатах

### API Endpoints
- `GET /api/messages` - получение истории чата из SQLite
- `POST /api/chat` - отправка сообщения, генерация SQL, выполнение запроса, возврат полного Message объекта
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
- Better-SQLite3 для базы данных
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
  database.ts - SQLite база и схема
  openai-service.ts - OpenAI интеграция с валидацией SQL
  routes.ts - API endpoints
  storage.ts - SQLite storage для персистентности сообщений

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
- better-sqlite3 - SQLite база
- exceljs - генерация Excel
- p-limit, p-retry - rate limiting и retries
- + стандартные React, TanStack Query, Shadcn UI

### Переменные окружения
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - автоматически через Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_API_KEY` - автоматически через Replit AI Integrations

## Завершенные этапы
1. ✅ Phase 1: Schema & Frontend - полностью реализовано
2. ✅ Phase 2: Backend - полностью реализовано
3. ✅ Phase 3: Integration & Testing - полностью завершено
   - ✅ Workflow запущен и работает стабильно
   - ✅ Все endpoints протестированы
   - ✅ E2E тесты пройдены (chat → SQL → results → export)
   - ✅ Architect review passed
   - ✅ История персистентна между перезапусками

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
