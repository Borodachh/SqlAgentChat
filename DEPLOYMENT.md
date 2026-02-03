# Инструкция по деплою AI SQL Chat Bot

Это руководство описывает развёртывание приложения на собственном сервере с PostgreSQL.

## Требования

- **Node.js** 18+ (рекомендуется 20 LTS)
- **PostgreSQL** 14+
- **npm** 9+
- Доступ к OpenAI API (или Ollama для локальных моделей)

---

## Часть 1: Подготовка сервера

### 1.1 Установка Node.js (Ubuntu/Debian)

```bash
# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node --version  # должно быть v20.x.x
npm --version   # должно быть 9.x.x или выше
```

### 1.2 Установка PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Запуск службы
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 1.3 Создание базы данных

```bash
# Вход под пользователем postgres
sudo -u postgres psql

# Создание пользователя и базы данных
CREATE USER sqlchat WITH PASSWORD 'your_secure_password';
CREATE DATABASE sqlchat_db OWNER sqlchat;
GRANT ALL PRIVILEGES ON DATABASE sqlchat_db TO sqlchat;

# Выход
\q
```

---

## Часть 2: Получение исходного кода

### Вариант A: Скачать из Replit

1. Откройте проект в Replit
2. Нажмите на три точки (меню) → "Download as zip"
3. Распакуйте архив на сервере

### Вариант B: Git clone (если есть репозиторий)

```bash
git clone https://github.com/your-username/ai-sql-chatbot.git
cd ai-sql-chatbot
```

---

## Часть 3: Настройка переменных окружения

### 3.1 Создание файла .env

Создайте файл `.env` в корне проекта:

```bash
nano .env
```

### 3.2 Содержимое .env

```bash
# =====================
# База данных
# =====================
DATABASE_URL=postgresql://sqlchat:your_secure_password@localhost:5432/sqlchat_db
DATABASE_TYPE=postgresql

# =====================
# LLM Provider
# =====================
# Выберите один из вариантов: openai, ollama, custom

LLM_PROVIDER=openai

# --- OpenAI ---
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-openai-api-key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# --- Ollama (локальные модели) ---
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434/v1
# OLLAMA_MODEL=llama3.1

# --- Custom API (OpenAI-совместимый) ---
# LLM_PROVIDER=custom
# CUSTOM_LLM_BASE_URL=https://your-api.com/v1
# CUSTOM_LLM_API_KEY=your-api-key
# CUSTOM_LLM_MODEL=your-model

# =====================
# Дополнительно
# =====================
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=2048
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-random-secret-string-here
```

### 3.3 Права доступа

```bash
chmod 600 .env
```

---

## Часть 4: Установка и сборка

### 4.1 Установка зависимостей

```bash
npm install
```

### 4.2 Инициализация базы данных

```bash
# Создание таблиц (chats, messages)
npm run db:push
```

### 4.3 Начальные данные (опционально)

Если нужны тестовые данные (сотрудники, продажи):

```bash
npx tsx server/seed.ts
```

### 4.4 Сборка production версии

```bash
npm run build
```

---

## Часть 5: Запуск приложения

### 5.1 Простой запуск

```bash
npm run start
```

Приложение будет доступно на `http://localhost:5000`

### 5.2 Запуск через PM2 (рекомендуется)

PM2 — менеджер процессов для автоматического перезапуска:

```bash
# Установка PM2
npm install -g pm2

# Запуск приложения
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

## Часть 6: Настройка Nginx (reverse proxy)

### 6.1 Установка Nginx

```bash
sudo apt install nginx
```

### 6.2 Конфигурация сайта

```bash
sudo nano /etc/nginx/sites-available/sqlchat
```

Содержимое:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # или IP-адрес сервера

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

    # Ограничение размера загружаемых файлов
    client_max_body_size 10M;
}
```

### 6.3 Активация и запуск

```bash
# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/sqlchat /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
```

---

## Часть 7: SSL-сертификат (HTTPS)

### 7.1 Установка Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

### 7.2 Получение сертификата

```bash
sudo certbot --nginx -d your-domain.com
```

Certbot автоматически настроит HTTPS и редирект с HTTP.

---

## Часть 8: Docker (альтернативный способ)

### 8.1 Dockerfile

Создайте `Dockerfile` в корне проекта:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Сборка
RUN npm run build

# Порт
EXPOSE 5000

# Запуск
CMD ["npm", "run", "start"]
```

### 8.2 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://sqlchat:password@db:5432/sqlchat_db
      - DATABASE_TYPE=postgresql
      - LLM_PROVIDER=openai
      - AI_INTEGRATIONS_OPENAI_API_KEY=${OPENAI_API_KEY}
      - AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
      - OPENAI_MODEL=gpt-4
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=sqlchat
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=sqlchat_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### 8.3 Запуск через Docker

```bash
# Сборка и запуск
docker-compose up -d

# Инициализация БД
docker-compose exec app npm run db:push

# Просмотр логов
docker-compose logs -f app
```

---

## Часть 9: Проверка работоспособности

### 9.1 Тест API

```bash
# Проверка конфигурации
curl http://localhost:5000/api/config

# Создание чата
curl -X POST http://localhost:5000/api/chats \
  -H "Content-Type: application/json"

# Отправка сообщения (замените {chatId} на ID чата)
curl -X POST http://localhost:5000/api/chats/{chatId}/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Покажи все таблицы в базе"}'
```

### 9.2 Веб-интерфейс

Откройте в браузере: `http://your-server-ip:5000` или `https://your-domain.com`

---

## Часть 10: Обновление приложения

```bash
# Остановка
pm2 stop sqlchat

# Получение обновлений
git pull  # или скачайте новые файлы

# Установка новых зависимостей
npm install

# Применение миграций БД
npm run db:push

# Пересборка
npm run build

# Запуск
pm2 start sqlchat
```

---

## Устранение неполадок

### Ошибка подключения к БД

```bash
# Проверка статуса PostgreSQL
sudo systemctl status postgresql

# Проверка подключения
psql -U sqlchat -h localhost -d sqlchat_db
```

### Ошибки LLM

```bash
# Проверка переменных окружения
cat .env | grep LLM
cat .env | grep OPENAI

# Тест API ключа
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-key"
```

### Просмотр логов

```bash
# PM2
pm2 logs sqlchat

# Docker
docker-compose logs -f app

# Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## Безопасность

1. **Файрвол**: откройте только порты 80, 443, 22
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw allow 22
   sudo ufw enable
   ```

2. **Не храните .env в Git**: добавьте в `.gitignore`

3. **Регулярные обновления**:
   ```bash
   sudo apt update && sudo apt upgrade
   ```

4. **Бэкапы БД**:
   ```bash
   pg_dump -U sqlchat sqlchat_db > backup_$(date +%Y%m%d).sql
   ```

---

## Поддержка

При возникновении проблем проверьте:
1. Логи приложения (`pm2 logs` или `docker-compose logs`)
2. Переменные окружения в `.env`
3. Подключение к базе данных
4. Доступность OpenAI API
