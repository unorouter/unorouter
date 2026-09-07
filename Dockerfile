FROM oven/bun:1.4 AS builder
WORKDIR /app
COPY package.json ./
# patchedDependencies in package.json point here; bun install fails without it.
COPY patches ./patches
RUN bun install
COPY . .
ENV STANDALONE=1
ENV NEXT_ADAPTER_PATH=next-bun-compile
ENV NEXT_BUN_COMPILE_VERBOSE=1
ARG TARGETARCH
ARG GIT_SHA=dev
ENV NEXT_PUBLIC_RELEASE_VERSION=$GIT_SHA
ENV NEXT_DEPLOYMENT_ID=$GIT_SHA
RUN --mount=type=cache,target=/app/.next/cache NBC_TARGET=bun-linux-$([ "$TARGETARCH" = arm64 ] && echo arm64 || echo x64) bun run build

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:9dac0a79194e45a7da0158a9c6da57b217585af0786db3845d1f0ec1a0dd182f AS prod
WORKDIR /app
ENV NODE_ENV=production
ARG GIT_SHA=dev
ENV NEXT_DEPLOYMENT_ID=$GIT_SHA
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# the binary extracts its runtime tree here on first start and runs with it as cwd
ENV NBC_RUNTIME_DIR=/app
COPY --from=builder --chown=nonroot:nonroot /app/server ./server
EXPOSE 3000
ENTRYPOINT ["./server"]
