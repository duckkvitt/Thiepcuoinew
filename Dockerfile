FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

COPY FE/package.json FE/package-lock.json ./
RUN npm ci --include=optional

COPY FE/ ./
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

COPY BE/package.json BE/package-lock.json ./
RUN npm ci --omit=dev

COPY BE/src ./src
COPY BE/scripts ./scripts
COPY --from=frontend-builder /frontend/dist ./public

RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 8080

CMD ["sh", "-c", "npm run db:init && exec node src/server.js"]

