# Pinned to 1.4: every Zig-era Bun (1.3.14 and the floating 1-alpine tag alike)
# segfaults with SIGILL at the very end of next build, after all routes compile.
# The Rust rewrite does not. Verify any bump with infra/scripts/build-local.sh.
FROM oven/bun:1.4-alpine AS builder
WORKDIR /app

COPY package.json ./
# patchedDependencies in package.json points here; bun install fails without it.
COPY patches ./patches

RUN bun install

COPY . .
ENV STANDALONE=1
# ENV NODE_ENV=development

# Commit SHA for PostHog sourcemap release versioning. The bun-alpine builder
# has no git binary, so posthog-cli cannot auto-detect the commit; pass it in
# so each deploy uploads sourcemaps under a UNIQUE release (a static version
# lets a later build's chunk hashes mismatch the uploaded maps).
ARG GIT_SHA=dev
ENV NEXT_PUBLIC_RELEASE_VERSION=$GIT_SHA
# Version-skew protection: every asset URL carries ?dpl=<sha>, so a tab still
# running an older build keeps fetching that build's chunks (see next.config).
ENV NEXT_DEPLOYMENT_ID=$GIT_SHA

RUN --mount=type=cache,target=/app/.next/cache bun run build

FROM oven/bun:1.4-alpine AS prod
WORKDIR /app

ENV NODE_ENV=production
# The builder's ENV does not survive the stage boundary, and the standalone
# server reads this at runtime to stamp ?dpl= onto asset URLs. Same ARG, same
# value as the build, or the HTML and the chunks would disagree.
ARG GIT_SHA=dev
ENV NEXT_DEPLOYMENT_ID=$GIT_SHA

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/drizzle ./drizzle
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/public ./public

# sharp is a native module, so standalone tracing leaves it out of the bundle.
# Both stages are bun-alpine, so the builder's binary is ABI-compatible and can
# be copied straight across. Bun.Image covers resize and re-encode but has no
# SVG loader, which is what the badge route rasterizes, so sharp stays.
COPY --from=builder --chown=appuser:appgroup /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=appuser:appgroup /app/node_modules/@img ./node_modules/@img

USER appuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["bun", "server.js"]
