FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json ./
# patchedDependencies in package.json points here; bun install fails without it.
COPY patches ./patches

RUN bun install

COPY . .
ENV STANDALONE=1
# ENV NODE_ENV=development

RUN --mount=type=cache,target=/app/.next/cache bun run build

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

# sharp is a native module Next standalone tracing cannot bundle across the
# bun-alpine -> node-alpine stage swap; install the node24-musl binary here.
# Install in an isolated empty dir so npm never resolves the standalone tree
# (which carries a github: dependency that would need git, absent on alpine),
# then drop the package into the standalone node_modules.
RUN mkdir -p /tmp/sharp && cd /tmp/sharp && \
    npm install --no-save --omit=dev sharp@0.35.1 && \
    cp -r /tmp/sharp/node_modules/. /app/node_modules/ && \
    rm -rf /tmp/sharp && \
    chown -R appuser:appgroup /app/node_modules

USER appuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["node", "server.js"]
