FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./

RUN npm ci

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY shared ./shared
COPY server ./server

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.js"]
