# AI SQL Chat Bot

Веб-приложение с AI-агентом для преобразования запросов на естественном языке в SQL. Поддерживаются OpenAI, Ollama и OpenAI-совместимые LLM, PostgreSQL и ClickHouse, экспорт в Excel/CSV, отправка отчетов в Telegram и многопользовательская работа с чатами.

## Возможности

- Преобразование вопросов на русском языке в SQL-запросы.
- Выполнение read-only запросов к PostgreSQL и ClickHouse.
- Множественные чаты с историей сообщений.
- Регистрация, логин и изоляция пользовательских данных.
- Экспорт результатов в `xlsx` и `csv`.
- Отправка отчетов в Telegram.
- Генерация заголовков отчетов на русском через LLM.
- Визуализация результатов в виде графиков.
- Сохранение и повторный запуск SQL-шаблонов.
- Просмотр схемы целевой базы данных.
- Дополнительные серверные ограничения безопасности для SQL и экспорта.

## Стек

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, React Query.
- Backend: Node.js, Express, TypeScript.
- Системная БД: PostgreSQL.
- Целевая БД: PostgreSQL или ClickHouse.
- Доступ к данным: Drizzle ORM, `express-session`, `connect-pg-simple`.
- Интеграции: OpenAI SDK, Telegram Bot API, ExcelJS.

## Архитектура

```text
Client (React)
  -> HTTP API
Server (Express)
  -> LLM provider
  -> Target DB (PostgreSQL / ClickHouse)
  -> System DB (PostgreSQL: users, chats, messages, sessions, templates)
```

Основные каталоги:

```text
client/   frontend на React + Vite
server/   API, auth, LLM, адаптеры БД
shared/   общая схема Drizzle и типы
tests/    node:test для серверных регрессий
```

## Быстрый старт

### Docker Compose

```bash
git clone https://github.com/Borodachh/SqlAgentChat
cd SqlAgentChat
cp .env.example .env
# заполните .env
docker compose up -d --build
```

Приложение будет доступно на `http://localhost:5000`.

### Локальный запуск

```bash
npm install
cp .env.example .env
# заполните .env
npm run db:push
npm run dev
```

Production-сборка:

```bash
npm run build
npm run start
```

## Переменные окружения

### Обязательные

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | системная PostgreSQL БД |
| `SESSION_SECRET` | секрет для подписывания сессий |

### LLM

| Переменная | Описание | По умолчанию |
|---|---|---|
| `LLM_PROVIDER` | `openai`, `ollama`, `custom` | `openai` |
| `LLM_TEMPERATURE` | температура генерации | `0.1` |
| `LLM_MAX_TOKENS` | максимум токенов ответа | `2048` |
| `OPENAI_MODEL` | модель OpenAI | `gpt-5` |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | URL OpenAI API | - |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | ключ OpenAI API | - |
| `OLLAMA_BASE_URL` | URL Ollama | `http://localhost:11434/v1` |
| `OLLAMA_MODEL` | модель Ollama | `llama3.1` |
| `CUSTOM_LLM_BASE_URL` | URL custom API | - |
| `CUSTOM_LLM_API_KEY` | ключ custom API | - |
| `CUSTOM_LLM_MODEL` | модель custom API | - |

### Базы данных

| Переменная | Описание | По умолчанию |
|---|---|---|
| `DATABASE_TYPE` | `postgresql` или `clickhouse` | `postgresql` |
| `TARGET_DATABASE_URL` | URL целевой PostgreSQL БД | `DATABASE_URL` |
| `TARGET_PGDATABASE` | имя целевой PostgreSQL БД | - |
| `CLICKHOUSE_URL` | URL ClickHouse | - |
| `CLICKHOUSE_DATABASE` | база ClickHouse | `default` |

### Telegram и Docker

| Переменная | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен Telegram-бота |
| `TELEGRAM_CHAT_ID` | chat id для отправки отчетов |
| `POSTGRES_USER` | пользователь PostgreSQL в Docker |
| `POSTGRES_PASSWORD` | пароль PostgreSQL в Docker |
| `POSTGRES_DB` | имя БД PostgreSQL в Docker |

## Примеры конфигурации

### OpenAI + PostgreSQL

```env
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4o
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@host/systemdb
TARGET_DATABASE_URL=postgresql://readonly:pass@host/analyticsdb
SESSION_SECRET=replace-me
```

### Ollama + PostgreSQL

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@host/systemdb
SESSION_SECRET=replace-me
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
SESSION_SECRET=replace-me
```

## Развёртывание

### Docker Compose

Минимальная конфигурация `.env`:

```env
POSTGRES_USER=sqlchat
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=sqlchat_db
SESSION_SECRET=your-random-secret-change-me
LLM_PROVIDER=openai
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

Запуск:

```bash
docker compose up -d --build
docker compose logs -f app
```

Полезные команды:

```bash
docker compose down
docker compose down -v
docker compose restart app
docker compose exec app npx tsx server/seed.ts
docker compose exec db pg_dump -U sqlchat sqlchat_db > backup_$(date +%Y%m%d).sql
cat backup.sql | docker compose exec -T db psql -U sqlchat sqlchat_db
```

### Docker без Compose

```bash
docker build -t ai-sql-chatbot .

docker run -d \
  --name ai-sql-chatbot \
  -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e SESSION_SECRET=your-secret \
  -e LLM_PROVIDER=openai \
  -e OPENAI_MODEL=gpt-4o \
  -e AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-key \
  -e AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1 \
  ai-sql-chatbot
```

### Ручная установка на VPS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql && sudo systemctl enable postgresql
```

Создание БД:

```sql
CREATE USER sqlchat WITH PASSWORD 'your_password';
CREATE DATABASE sqlchat_db OWNER sqlchat;
GRANT ALL PRIVILEGES ON DATABASE sqlchat_db TO sqlchat;
```

Установка приложения:

```bash
git clone https://github.com/Borodachh/SqlAgentChat
cd SqlAgentChat
npm install
cp .env.example .env
npm run db:push
npm run build
```

Запуск через PM2:

```bash
npm install -g pm2
pm2 start npm --name "sqlchat" -- run start
pm2 startup
pm2 save
```

Пример `systemd` unit:

```ini
[Unit]
Description=AI SQL Chat Bot
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/SqlAgentChat
EnvironmentFile=/opt/SqlAgentChat/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
```

Для HTTPS:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Ollama

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.1
```

Для Docker Compose можно добавить сервис:

```yaml
ollama:
  image: ollama/ollama
  volumes:
    - ollama_data:/root/.ollama
  ports:
    - "11434:11434"
  restart: unless-stopped
```

Если приложение в контейнере обращается к локальному Ollama:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
```

И добавьте:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

## API

### Авторизация

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/auth/register` | регистрация |
| POST | `/api/auth/login` | вход |
| POST | `/api/auth/logout` | выход |
| GET | `/api/auth/me` | текущий пользователь |

### Чаты и сообщения

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/chats` | список чатов |
| POST | `/api/chats` | создать чат |
| DELETE | `/api/chats/:chatId` | удалить чат |
| GET | `/api/chats/:chatId/messages` | история сообщений |
| POST | `/api/chats/:chatId/chat` | вопрос -> SQL -> результат |

### Шаблоны и служебные эндпоинты

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/templates` | список шаблонов |
| POST | `/api/templates` | сохранить шаблон |
| DELETE | `/api/templates/:id` | удалить шаблон |
| POST | `/api/export?format=xlsx|csv` | скачать отчет |
| POST | `/api/send-telegram` | отправить отчет в Telegram |
| GET | `/api/config` | активная конфигурация |
| GET | `/api/tables` | схема целевой БД |

## Проверки

Минимальный набор проверок перед коммитом:

```bash
npm run check
npm test
```

Ручной smoke test:
- регистрация и логин;
- создание чата;
- генерация и выполнение SQL;
- экспорт в `xlsx` и `csv`;
- отправка в Telegram при настроенных переменных окружения.

## Решение проблем

Проверка БД:

```bash
docker compose logs db
docker compose exec db psql -U sqlchat -d sqlchat_db
psql "$DATABASE_URL" -c "SELECT 1;"
```

Проверка логов:

```bash
docker compose logs -f app
pm2 logs sqlchat
journalctl -u ai-sql-chatbot
sudo tail -f /var/log/nginx/error.log
```

Если не работает LLM:
- проверьте API-ключ и base URL;
- для Ollama убедитесь, что запущен `ollama serve`;
- для custom API проверьте совместимость с OpenAI chat completions.

## Безопасность

- Не коммитьте `.env`.
- Используйте отдельную системную БД и read-only доступ к целевой БД.
- Для production обязательно задавайте `SESSION_SECRET`.
- В production размещайте приложение за reverse proxy с HTTPS.
- Делайте регулярные бэкапы БД.
