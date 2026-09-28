FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

RUN npm install

COPY packages/shared ./packages/shared
RUN npm run build --workspace=@upi-crypto/shared

COPY apps/api ./apps/api
RUN npm run build --workspace=@upi-crypto/api

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/db/schema.sql ./apps/api/dist/db/schema.sql

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
