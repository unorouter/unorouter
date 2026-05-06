FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json ./

RUN bun install

#
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /usr/local/bin/bun /usr/local/bin/bun
COPY . .
COPY --from=deps /app/node_modules ./node_modules
ENV STANDALONE=1
# ENV NODE_ENV=development

RUN bun run build

#
# Prod runtime: Node (Next.js standalone is built for Node and is ~5-10x faster
# than running it under Bun, which has incomplete fast paths for the RSC pipeline
# and AsyncLocalStorage). Build still runs on Bun (faster install + build).
FROM node:24-alpine AS prod
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/drizzle ./drizzle
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/public ./public

USER appuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
