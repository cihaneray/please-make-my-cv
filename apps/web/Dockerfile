FROM node:26.12.0-alpine3.23@sha256:2ae3a23c9c5d2129398f4844c7c43400c061faf6973852f0fa837323bff9a5a8 AS dependencies

WORKDIR /app
RUN addgroup -g 10001 app && adduser -D -u 10001 -G app app && chown app:app /app

COPY --chown=app:app package*.json ./
USER app
RUN --mount=type=cache,target=/home/app/.npm,uid=10001,gid=10001 npm ci \
    && rm -rf node_modules/@next/swc-linux-x64-gnu node_modules/@next/swc-linux-arm64-gnu

FROM dependencies AS development
COPY --chown=app:app . .
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--webpack"]

FROM dependencies AS builder

COPY --chown=app:app . .
ARG API_INTERNAL_URL=http://127.0.0.1:8000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV CV_STANDALONE=1
RUN npm run build

FROM node:26.12.0-alpine3.23@sha256:2ae3a23c9c5d2129398f4844c7c43400c061faf6973852f0fa837323bff9a5a8 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -g 10001 app && adduser -D -u 10001 -G app app \
    && chown app:app /app && rm -rf /usr/local/lib/node_modules/npm /opt/yarn*
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app

EXPOSE 3000

CMD ["node", "server.js"]
