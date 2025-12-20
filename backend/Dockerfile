FROM node:22-alpine AS builder

WORKDIR /usr/src/app

ARG DATABASE_URL=postgresql://admin:admin123@postgres:5432/traffic_ai?schema=public
ENV DATABASE_URL=$DATABASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ARG DATABASE_URL=postgresql://admin:admin123@postgres:5432/traffic_ai?schema=public
ENV DATABASE_URL=$DATABASE_URL

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/src/main.js"]
