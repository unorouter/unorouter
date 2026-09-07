FROM oven/bun:1.4-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY patches ./patches

RUN bun install

COPY . .
ENV STANDALONE=1
# ENV NODE_ENV=development

ARG GIT_SHA=dev
ENV NEXT_PUBLIC_RELEASE_VERSION=$GIT_SHA
ENV NEXT_DEPLOYMENT_ID=$GIT_SHA

RUN --mount=type=cache,target=/app/.next/cache bun run build
RUN rm -f .next/standalone/.env

# The distroless bun image is glibc only: no libgcc, no libstdc++. The gnu builds of
# the libsql and sharp bindings dlopen both, so they come from the matching debian
# bun image (same glibc generation as distroless/base-debian12).
FROM oven/bun:1.4 AS libs
RUN T=$(uname -m)-linux-gnu && mkdir -p /out/$T && \
    cp -L /lib/$T/libgcc_s.so.1 /usr/lib/$T/libstdc++.so.6 /out/$T/

# Runtime is distroless: bun binary plus glibc, no shell, no package manager, no
# root. bun install puts both the musl and the gnu native bindings (sharp, libsql)
# into node_modules, so the alpine builder output runs on glibc unchanged.
FROM oven/bun:1.4-distroless AS prod
WORKDIR /app
COPY --from=libs /out/ /usr/lib/

ENV NODE_ENV=production
# The builder's ENV does not survive the stage boundary, and the standalone
# server reads this at runtime to stamp ?dpl= onto asset URLs. Same ARG, same
# value as the build, or the HTML and the chunks would disagree.
ARG GIT_SHA=dev
ENV NEXT_DEPLOYMENT_ID=$GIT_SHA

COPY --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/drizzle ./drizzle
COPY --from=builder --chown=1001:1001 /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 /app/public ./public

# sharp is a native module, so standalone tracing leaves it out of the bundle.
# Bun.Image covers resize and re-encode but has no SVG loader, which is what the
# badge route rasterizes, so sharp stays.
COPY --from=builder --chown=1001:1001 /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=1001:1001 /app/node_modules/@img ./node_modules/@img

USER 1001:1001

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["bun", "server.js"]
