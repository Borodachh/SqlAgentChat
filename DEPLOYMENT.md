# Развёртывание AI SQL Chat Bot

## Требования

- Node.js 20+ (для ручной установки)
- PostgreSQL 14+ (системная БД)
- Docker 20+ и Docker Compose 2.0+ (для Docker-установки)
- Доступ к LLM API (OpenAI / Ollama / Custom)

---

## Способ 1: Docker Compose (рекомендуется)

### 1.1 Получение кода

```bash
git clone <repo-url>
cd ai-sql-chatbot
```

### 1.2 Настройка

```bash
cp .env.example .env
nano .env
```

Минимальная конфигурация:

```env
# PostgreSQL (создаётся автоматически)
POSTGRES_USER=sqlchat
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=sqlchat_db

# Сессии
SESSION_SECRET=your-random-secret-change-me

# LLM
LLM_PROVIDER=openai
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# Целевая БД для запросов (опционально, если отличается от системной)
# TARGET_DATABASE_URL=postgresql://user:pass@host/analyticsdb

# Telegram (опционально)
# TELEGRAM_BOT_TOKEN=123456:ABC-DEF
# TELEGRAM_CHAT_ID=-1001234567890
```

### 1.3 Запуск

```bash
docker compose up -d --build
```

Приложение автоматически:
- Создаст PostgreSQL базу данных
- Дождётся готовности БД (healthcheck)
- Применит миграции
- Запустит сервер на порте 5000

### 1.4 Проверка

```bash
# Логи
docker compose logs -f app

# API
curl http://localhost:5000/api/config

# Веб-интерфейс: http://your-server:5000
```

### 1.5 Управление

```bash
docker compose down              # Остановка
docker compose down -v           # Остановка + удаление данных
docker compose restart app       # Перезапуск
docker compose logs -f app       # Логи приложения
docker compose logs -f db        # Логи БД
```

### 1.6 Загрузка тестовых данных

```bash
docker compose exec app npx tsx server/seed.ts
```

### 1.7 Обновление

```bash
git pull
docker compose up -d --build
```

### 1.8 Бэкап БД

```bash
# Создание
docker compose exec db pg_dump -U sqlchat sqlchat_db > backup_$(date +%Y%m%d).sql

# Восстановление
cat backup.sql | docker compose exec -T db psql -U sqlchat sqlchat_db
```

---

## Способ 2: Docker (без Compose, с внешней БД)

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

---

## Способ 3: Ручная установка (VPS)

### 3.1 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3.2 PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql && sudo systemctl enable postgresql

sudo -u postgres psql
CREATE USER sqlchat WITH PASSWORD 'your_password';
CREATE DATABASE sqlchat_db OWNER sqlchat;
GRANT ALL PRIVILEGES ON DATABASE sqlchat_db TO sqlchat;
\q
```

### 3.3 Установка приложения

```bash
git clone <repo-url>
cd ai-sql-chatbot
npm install
cp .env.example .env
nano .env   # Укажите DATABASE_URL и настройки LLM
npm run db:push
npm run build
```

### 3.4 Запуск через PM2

```bash
npm install -g pm2
pm2 start npm --name "sqlchat" -- run start
pm2 startup
pm2 save
```

### 3.5 Systemd (альтернатива PM2)

Создайте `/etc/systemd/system/ai-sql-chatbot.service`:

```ini
[Unit]
Description=AI SQL Chat Bot
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ai-sql-chatbot
EnvironmentFile=/opt/ai-sql-chatbot/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-sql-chatbot
sudo systemctl start ai-sql-chatbot
```

---

## Nginx (reverse proxy)

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/sqlchat
```

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 120s;
    }

    client_max_body_size 10M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sqlchat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Ollama (локальные модели без OpenAI)

### Установка

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.1
```

### Конфигурация

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
```

### Docker + Ollama

Добавьте в `docker-compose.yml`:

```yaml
  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    restart: unless-stopped
```

В `.env`:
```env
OLLAMA_BASE_URL=http://ollama:11434/v1
```

Или при локальном Ollama из Docker-контейнера:
```env
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
```

Добавьте в docker-compose `extra_hosts`:
```yaml
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

## Подключение к внешней БД для запросов

Системная БД (DATABASE_URL) хранит пользователей, чаты и сессии. Целевая БД — та, по которой пользователи задают вопросы.

### PostgreSQL

```env
DATABASE_TYPE=postgresql
TARGET_DATABASE_URL=postgresql://readonly:pass@analytics-server:5432/warehouse
TARGET_PGDATABASE=warehouse
```

### ClickHouse

```env
DATABASE_TYPE=clickhouse
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_DATABASE=analytics
```

---

## Telegram-бот

### Создание

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. `/newbot` -> задайте имя и username
3. Скопируйте токен

### Получение chat_id

1. Добавьте бота в чат/группу
2. Отправьте сообщение
3. Откройте `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Найдите `chat.id`

### Конфигурация

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890
```

---

## Полный список переменных окружения

| Переменная | Обязательная | Описание | По умолчанию |
|---|---|---|---|
| `DATABASE_URL` | Да | Системная PostgreSQL | - |
| `SESSION_SECRET` | Да | Секрет для сессий | - |
| `LLM_PROVIDER` | Нет | openai / ollama / custom | `openai` |
| `LLM_TEMPERATURE` | Нет | Температура | `0.1` |
| `LLM_MAX_TOKENS` | Нет | Макс. токенов | `2048` |
| `OPENAI_MODEL` | Нет | Модель OpenAI | `gpt-5` |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Нет | URL OpenAI API | - |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Нет | Ключ OpenAI | - |
| `OLLAMA_BASE_URL` | Нет | URL Ollama | `http://localhost:11434/v1` |
| `OLLAMA_MODEL` | Нет | Модель Ollama | `llama3.1` |
| `CUSTOM_LLM_BASE_URL` | Нет | URL Custom API | - |
| `CUSTOM_LLM_API_KEY` | Нет | Ключ Custom API | - |
| `CUSTOM_LLM_MODEL` | Нет | Модель Custom API | - |
| `DATABASE_TYPE` | Нет | Тип целевой БД | `postgresql` |
| `TARGET_DATABASE_URL` | Нет | URL целевой БД | DATABASE_URL |
| `TARGET_PGDATABASE` | Нет | Имя целевой БД | - |
| `CLICKHOUSE_URL` | Нет | URL ClickHouse | - |
| `CLICKHOUSE_DATABASE` | Нет | БД ClickHouse | `default` |
| `TELEGRAM_BOT_TOKEN` | Нет | Токен Telegram-бота | - |
| `TELEGRAM_CHAT_ID` | Нет | ID чата Telegram | - |
| `POSTGRES_USER` | Docker | Пользователь PG | - |
| `POSTGRES_PASSWORD` | Docker | Пароль PG | - |
| `POSTGRES_DB` | Docker | Имя БД PG | - |

---

## Решение проблем

### БД не подключается

```bash
# Docker
docker compose logs db
docker compose exec db psql -U sqlchat -d sqlchat_db

# Локально
sudo systemctl status postgresql
psql $DATABASE_URL -c "SELECT 1;"
```

### Ошибки LLM

- Проверьте API-ключ
- Ollama: `ollama serve` должен быть запущен
- Custom API: проверьте совместимость с OpenAI форматом

### Ошибки миграций

```bash
npm run db:push
```

### Логи

```bash
docker compose logs -f app   # Docker
pm2 logs sqlchat             # PM2
journalctl -u ai-sql-chatbot # systemd
sudo tail -f /var/log/nginx/error.log  # Nginx
```

---

## Безопасность

1. **Файрвол**: откройте только 80, 443, 22
2. **Не коммитьте .env** в Git
3. **Права доступа**: `chmod 600 .env`
4. **SSL**: обязательно для production
5. **Регулярные бэкапы БД**
6. **Обновления ОС**: `sudo apt update && sudo apt upgrade`
