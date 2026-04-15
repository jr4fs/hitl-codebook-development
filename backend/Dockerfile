FROM node:20-alpine AS build

WORKDIR /app

COPY backend/package*.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY common ./common
COPY backend/src ./backend/src

RUN cd backend \
  && npm ci \
  && npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package*.json ./backend/
COPY pybackend/prompts ./pybackend/prompts

RUN cd backend && npm ci --omit=dev

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "backend/dist/backend/src/index.js"]
