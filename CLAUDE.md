Next.js 16 AI chat app. React 19, Tailwind v4, shadcn/ui. Elysia BFF in front of an upstream `new-api` service. Turso/SQLite for chat-only local state.

## Commands

```bash
bun dev:log          # dev server (logs to /tmp/next.log)
bun build            # production build. prebuild: search index + SEO timestamps. postbuild: openapi refs
bun lint             # eslint
bun prettier         # format the repo
bun openapi          # regenerate openapi.ts from upstream spec (Orval)
bun db:generate      # drizzle-kit generate migration
bun db:reset         # reset local chat DB
```

Other scripts in `scripts/`: `generate-web-bot-auth-key.ts`, `lighthouse.ts`, `indexnow.ts`.

NEVER start, restart, or kill the dev server. Read `/tmp/next.log` for errors. Use browser MCP to inspect.

## Architecture

This is a BFF (backend-for-frontend), not a full-stack ledger. Most server verticals (`auth`, `billing`, `token`, `affiliate`, `logs`, `pricing`, `dashboard`, `stats`, `settings`, `badge`, `checkout-sessions`, `model-status`) are thin typed pass-throughs to the upstream `new-api` backend via Orval-generated clients. The `chat` vertical is the exception: it owns its own Turso DB (conversations, messages, shared links, plus the RP entities: characters, personas, presets, lorebooks, bindings) and its own logic (streaming, prompt assembly, media, moderation, title generation, web search, video tasks, conversation import/export).

- BFF routes (`src/app/api/[[...route]]/route.ts`, Elysia): mount all `src/server/<feature>/route.ts` under `/api`. Request ID and duration logging on every request, structured error taxonomy at the boundary.
- Upstream client: `src/openapi.ts` (Orval-generated, never edit). Use `deriveUpstream` and `unwrap(res)` to forward.
- Local DB (chat only): Turso/libSQL via Drizzle ORM. Schema in `src/lib/db/schema.ts`, client in `src/lib/db/client.ts`. Auto-migrates on first `getDb()` call.
- Client state: Jotai (UI plus cookie-backed persistence via `atomWithStorage` and `jotaiCookieStorage`).
- Server state: React Query 5. Mutations use `setQueryData` plus pure cache helpers, not `invalidateQueries`.
- Type pipeline: TypeBox schema, Elysia validation, Eden Treaty RPC, `handleElysia()`, React Query hook.
- i18n: next-intl. Locales in `public/i18n/`: `en`, `de`, `fr`, `ja`, `ru`, `vi`, `zh-CN`, `zh-TW`. `proxy.ts` handles locale middleware.
- Media: Cloudflare R2 via AWS SDK, helpers in `src/lib/config/r2.ts`.
- Search: Orama, index pregenerated at build time (`scripts/generate-search-index.ts`).
- SEO: `src/lib/seo/` (`metadata.ts`, `structured-data.ts`, `json-ld.tsx`, `docs-schema.tsx`, `timestamps.ts`). Build-time timestamps via `scripts/generate-seo-timestamps.ts`.
- Observability: Pino logger (`src/lib/utils/logger.ts`, always include `context` field). PostHog server and client via `src/instrumentation.ts` and `src/instrumentation-client.ts`.
- Auth: upstream-driven OAuth. App sets `access_token` (httpOnly) and `user-id` cookies after callback. Turnstile on login and register.

## Route return conventions

Two patterns, pick by vertical:

- Pass-through verticals (`billing`, `auth`, `token`, `affiliate`, `logs`, `pricing`, `dashboard`, `stats`, `settings`, `badge`, `checkout-sessions`, `health`, `model-status`): `return unwrap(res)`. The upstream response shape flows through. No wrapping.
- Local-logic vertical (`chat`, including its `rp` and `transfer` subroutes): `return { success: true, data }`. Wrapping is needed so `handleElysia()` on the client can distinguish success from typed failure.

Stick to the pattern of the vertical you're editing. Don't mix.

## Validation file layout

Two TypeBox folders, by route type:

- `src/lib/validation/`: schemas for the `chat` vertical (local DB) and feature-specific validation (badge, media, etc.). Includes `helpers.ts` (`safeParse`).
- `src/lib/api/typebox/`: schemas for BFF pass-through verticals, mirror the upstream API surface.

## Rules

- No prop destructuring in function signatures. Use `props.field`. Exceptions: spreading, defaults.
- Full translation keys with UPPER_SNAKE nesting: `t("BILLING.CURRENT_BALANCE")`. Use `msg()` for non-React code.
- Real translations in every locale file. Never English placeholders for other languages. Chinese files use full-width punctuation.
- Query keys from `src/lib/react-query/keys.ts` only. Never raw string arrays.
- Cache updates via `setQueryData` plus pure helpers (`src/lib/react-query/conv-cache.ts`). Avoid `invalidateQueries` and `refetch` in mutation hooks.
- No `useMemo` or `useCallback`. React 19 compiler handles memoization.
- No dashes as punctuation (em, en, `--`). Rephrase.
- Named exports for components. `"use client"` at the top of client components.
- Kebab-case file names. Suffixes: `*.service.ts`, `route.ts`, `*-hook.ts`, `*-store.ts`.

## Key patterns

Elysia routes (`src/server/<feature>/route.ts`): validate with TypeBox (`body:` and `query:`), derive upstream headers with `.derive(deriveUpstream)`, call either the Orval client (pass-throughs) or a local `*.service.ts` (chat). The Elysia root at `src/app/api/[[...route]]/route.ts` adds `requestId`, timing, and error taxonomy. Don't add try/catch in route handlers; let the boundary handle it.

Mutations (client side): call Eden Treaty, unwrap with `handleElysia()`, use `handleError(e, t)` in `onError` for i18n toasts. Optimistic updates use `onMutate` with snapshot and rollback. Reference: `src/hooks/chat-hook.ts`.

Jotai atoms: `atomWithStorage` plus `jotaiCookieStorage` for persistence. Derived atoms via `atom(getter, setter)`. For non-React callers (stream callbacks) that need synchronous access to current conversation state, use plain module variables in `src/store/chat-store.ts`.

Server pages: prefetch with `getQueryClient()` plus `HydrationBoundary` and `dehydrate()`.

Auth cookies (`src/lib/config/constants.ts`):

- `access_token`: httpOnly, upstream API token, 30 day TTL
- `user-id`: readable by server handlers, used by `getUserId(cookie)` in `src/server/constants.ts`
- `client-store`: JSON, holds user's own API key (for direct `getApiKey(cookie)` use)
- Guest users fall back to `GUEST_API_KEY` via `getApiKeyOrGuest(cookie)`

## Type safety pipeline

```
TypeBox schema -> Elysia validation -> Eden Treaty RPC -> handleElysia() -> React Query hook
```

- `handleElysia()` and `unwrap()`: `src/lib/utils/base.ts`
- `handleError()`: `src/lib/utils/client.ts`
- Eden type helpers (`EdenArgs`, `EdenResponse`, `EdenQuery`): `src/lib/types/eden.ts`
- Upstream client: `src/openapi.ts` (Orval auto-generated, never edit; regenerate with `bun openapi`)

## Chat vertical specifics

The only vertical with real business logic. Organized into three subfolders under `src/server/chat/`:

Core (`src/server/chat/`):

- `route.ts`: chat root route, mounts subroutes
- `conversation.service.ts`: conversations CRUD, share links
- `message.service.ts`: message persistence, pending-usage buffering (`pendingUsageByConv`, TTL-swept on write)
- `stream.service.ts`: `streamText` from `ai` SDK, UI message stream wiring

Augmentation (`src/server/chat/augmentation/`): pipeline pieces the stream service composes.

- `prompt-assembler.service.ts`: assembles the final prompt (system, persona, lorebook, history) before stream
- `media.service.ts`: R2 upload pipeline
- `moderation.service.ts`: content moderation gate
- `task.service.ts`: async video task polling
- `title.service.ts`: auto-title generation
- `tavily.service.ts`: web search

RP (`src/server/chat/rp/`): roleplay entities, all locally persisted.

- `route.ts`: RP subroute, mounted under chat
- `character.service.ts` plus `character-card.ts` (SillyTavern card v2/v3 import)
- `persona.service.ts` plus `persona-import.ts`
- `lorebook.service.ts` plus `lorebook-import.ts`
- `preset.service.ts`: generation presets
- `binding.service.ts`: links characters/personas/presets/lorebooks to a conversation

Transfer (`src/server/chat/transfer/`):

- `export.service.ts`, `import.service.ts`: conversation import/export
- `sillytavern-chat.ts`: SillyTavern chat format adapter

Chat (core, RP, transfer) is the only place with local DB writes. Everything else reads or writes upstream.

## Other server verticals

- `badge/`: dynamic SVG/PNG badge rendering with Satori. Templates and elements live next to the route.
- `checkout-sessions/`: payment session creation with idempotency and typed error taxonomy.
- `health/`: simple health probe.
- `model-status/`: pass-through for upstream model availability/status checks. Hook: `src/hooks/use-model-status-hook.ts`. Store: `src/store/status-store.ts`.
- `web-bot-auth/`: middleware for verified bot signature auth (sits in `src/server/web-bot-auth/middleware.ts` and `src/lib/web-bot-auth/`).

## Route groups (app directory)

Locale-prefixed groups under `src/app/[locale]/`:

- `(auth)`: login, register
- `(chat)`: main chat UI (`chat/`) and shared conversation view (`shared/`)
- `(sidebar)`: dashboard, billing, settings, token, affiliate, logs
- `(navbar)`: marketing surface. Contains `(home)`, `pricing`, `models`, `blog`, and nested `(legal)` (privacy, terms).
- `(docs)`: fumadocs-based docs, split into:
  - `(cli)`: openclaw, codex, gemini-cli, claude-code, cc-switch
  - `(rp)`: chub, janitor-ai, risuai, sillytavern
- `(status)`: model status page (`status/`), backed by the `model-status` vertical
- `consent/`: cookie/consent flow (not a route group, plain segment)

Non-locale groups under `src/app/`:

- `(discovery)`: static SEO surface (humans.txt, llms.txt, openapi.json, robots.txt)
- `api/[[...route]]`: Elysia BFF entrypoint
