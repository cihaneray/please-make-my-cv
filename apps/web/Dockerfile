FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM dependencies AS development
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--webpack"]

FROM dependencies AS builder

COPY . .
ARG API_INTERNAL_URL=http://127.0.0.1:8000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV CV_STANDALONE=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
