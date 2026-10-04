FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS development
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--webpack"]

FROM dependencies AS builder

COPY . .
ARG API_INTERNAL_URL=http://127.0.0.1:8000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000

CMD ["npm", "start"]
