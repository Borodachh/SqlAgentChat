# Инструкция по деплою AI SQL Chat Bot

Это руководство описывает развёртывание приложения на собственном сервере с PostgreSQL.

---

## Способ 1: Docker (рекомендуется)

Самый простой и быстрый способ. Требуется только Docker и Docker Compose.

### 1.1 Требования

- **Docker** 20+
- **Docker Compose** 2.0+

Установка Docker (Ubuntu):
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Перелогиньтесь для применения изменений
```

### 1.2 Получение исходного кода

**Вариант A: Скачать из Replit**
1. Откройте проект в Replit
2. Нажмите на три точки (меню) → "Download as zip"
3. Распакуйте архив на сервере

**Вариант B: Git clone**
```bash
git clone https://github.com/your-username/ai-sql-chatbot.git
cd ai-sql-chatbot
```

### 1.3 Настройка переменных окружения

```bash
# Скопируйте шаблон
cp .env.example .env

# Отредактируйте файл
nano .env
```

Обязательные параметры в `.env`:
```bash
# PostgreSQL (для Docker)
POSTGRES_USER=sqlchat
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=sqlchat_db

# LLM Provider (OpenAI/Ollama/Custom)
LLM_PROVIDER=openai
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-openai-api-key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Безопасность
SESSION_SECRET=your-random-secret-string
```

Полный список параметров — в файле `.env.example`.

### 1.4 Сборка и запуск

```bash
# Сборка образа и запуск контейнеров
docker compose up -d --build

# Проверка статуса
docker compose ps

# Просмотр логов
docker compose logs -f app
```

Приложение автоматически:
- Создаст PostgreSQL базу данных
- Дождётся готовности БД (healthcheck)
- Применит миграции (создаст таблицы)
- Запустит сервер на порте 5000

### 1.5 Проверка

```bash
# API статус
curl http://localhost:5000/api/config

# Веб-интерфейс
# Откройте http://your-server-ip:5000 в браузере
```

### 1.6 Загрузка тестовых данных (опционально)

```bash
docker compose exec app npx tsx server/seed.ts
```

### 1.7 Управление

```bash
# Остановка
docker compose down

# Остановка с удалением данных БД
docker compose down -v

# Перезапуск
docker compose restart app

# Обновление (после git pull)
docker compose up -d --build

# Логи
docker compose logs -f app
docker compose logs -f db
```

### 1.8 Бэкап базы данных (Docker)

```bash
# Создание бэкапа
docker compose exec db pg_dump -U sqlchat sqlchat_db > backup_$(date +%Y%m%d).sql

# Восстановление из бэкапа
cat backup_20260212.sql | docker compose exec -T db psql -U sqlchat sqlchat_db
```

---

## Способ 2: Ручная установка

Подходит для серверов без Docker.

### 2.1 Требования

- **Node.js** 18+ (рекомендуется 20 LTS)
- **PostgreSQL** 14+
- **npm** 9+
- Доступ к OpenAI API (или Ollama для локальных моделей)

### 2.2 Установка Node.js (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node --version  # v20.x.x
npm --version   # 9.x.x+
```

### 2.3 Установка PostgreSQL

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.4 Создание базы данных

```bash
sudo -u postgres psql

CREATE USER sqlchat WITH PASSWORD 'your_secure_password';
CREATE DATABASE sqlchat_db OWNER sqlchat;
GRANT ALL PRIVILEGES ON DATABASE sqlchat_db TO sqlchat;
\q
```

### 2.5 Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Укажите `DATABASE_URL` для прямого подключения:
```bash
DATABASE_URL=postgresql://sqlchat:your_secure_password@localhost:5432/sqlchat_db
```

### 2.6 Установка и сборка

```bash
# Установка зависимостей
npm install

# Создание таблиц
npm run db:push

# Тестовые данные (опционально)
npx tsx server/seed.ts

# Сборка production версии
npm run build
```

### 2.7 Запуск

**Простой запуск:**
```bash
npm run start
```

**Через PM2 (рекомендуется для production):**
```bash
npm install -g pm2

pm2 start npm --name "sqlchat" -- run start

# Автозапуск при перезагрузке сервера
pm2 startup
pm2 save

# Полезные команды
pm2 status          # статус
pm2 logs sqlchat    # логи
pm2 restart sqlchat # перезапуск
pm2 stop sqlchat    # остановка
```

---

## Настройка Nginx (reverse proxy)

Применимо к обоим способам деплоя. Nginx обеспечивает HTTPS, сжатие и безопасность.

### Установка

```bash
sudo apt install nginx
```

### Конфигурация

```bash
sudo nano /etc/nginx/sites-available/sqlchat
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Таймауты для длительных запросов к LLM
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 120s;
    }

    client_max_body_size 10M;
}
```

### Активация

```bash
sudo ln -s /etc/nginx/sites-available/sqlchat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## SSL-сертификат (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot автоматически настроит HTTPS и редирект с HTTP.

---

## Использование с Ollama (локальные модели)

Для работы без OpenAI API можно использовать Ollama — локальный LLM.

### Установка Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh

# Скачивание модели
ollama pull llama3.1
```

### Настройка .env

```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
```

### Docker с Ollama

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

И измените в `.env`:
```bash
OLLAMA_BASE_URL=http://ollama:11434/v1
```

---

## Подключение к внешней базе данных

Если PostgreSQL находится на другом сервере:

### Ручная установка

Укажите адрес в `.env`:
```bash
DATABASE_URL=postgresql://user:password@remote-host:5432/database_name
```

### Docker с внешней БД

Создайте файл `docker-compose.external-db.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "${PORT:-5000}:5000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

Укажите `DATABASE_URL` в `.env` (адрес внешнего сервера):
```bash
DATABASE_URL=postgresql://user:password@remote-host:5432/database_name
```

Запустите только приложение:
```bash
docker compose -f docker-compose.external-db.yml up -d --build
```

Убедитесь, что удалённый PostgreSQL:
- Разрешает подключения с IP вашего сервера (файл `pg_hba.conf`)
- Порт 5432 открыт в файрволе

---

## Обновление приложения

### Docker

```bash
git pull
docker compose up -d --build
```

### Ручная установка

```bash
pm2 stop sqlchat
git pull
npm install
npm run db:push
npm run build
pm2 start sqlchat
```

---

## Устранение неполадок

### Ошибка подключения к БД

```bash
# Docker
docker compose logs db
docker compose exec db psql -U sqlchat -d sqlchat_db

# Ручная установка
sudo systemctl status postgresql
psql -U sqlchat -h localhost -d sqlchat_db
```

### Ошибки LLM

```bash
# Проверка переменных
grep -E "LLM|OPENAI|OLLAMA" .env

# Тест OpenAI API ключа
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-key"

# Тест Ollama
curl http://localhost:11434/api/tags
```

### Просмотр логов

```bash
# Docker
docker compose logs -f app

# PM2
pm2 logs sqlchat

# Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## Безопасность

1. **Файрвол** — откройте только необходимые порты:
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw allow 22
   sudo ufw enable
   ```

2. **Не храните .env в Git** — файл `.env` уже в `.dockerignore`

3. **Регулярные обновления**:
   ```bash
   sudo apt update && sudo apt upgrade
   ```

4. **Бэкапы БД**:
   ```bash
   # Docker
   docker compose exec db pg_dump -U sqlchat sqlchat_db > backup_$(date +%Y%m%d).sql

   # Локальная БД
   pg_dump -U sqlchat sqlchat_db > backup_$(date +%Y%m%d).sql
   ```

5. **Права доступа к .env**:
   ```bash
   chmod 600 .env
   ```

---

## Структура файлов деплоя

```
project/
├── Dockerfile          # Multi-stage сборка приложения
├── docker-compose.yml  # Оркестрация app + PostgreSQL
├── .dockerignore       # Исключения для Docker
├── .env.example        # Шаблон переменных окружения
├── .env                # Ваши настройки (не в Git!)
└── DEPLOYMENT.md       # Эта инструкция
```
