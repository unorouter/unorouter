Next.js 16 AI chat app. React 19, Tailwind v4, shadcn/ui. Elysia BFF in front of an upstream `new-api` service. Turso/SQLite for chat-only local state.

## Commands

```bash
bun dev:log          # dev server (logs to /tmp/next.log)
bun build            # production build
bun lint             # eslint
bun openapi          # regenerate openapi.ts from upstream spec (Orval)
bun db:generate      # drizzle-kit generate migration
bun db:reset         # reset local chat DB
bun lh               # lighthouse audit
```

NEVER start/restart/kill the dev server. Read `/tmp/next.log` for errors. Use browser MCP to inspect.

## Architecture

This is a **BFF (backend-for-frontend)**, not a full-stack ledger. Most server verticals (`auth`, `billing`, `token`, `affiliate`, `logs`, `pricing`, `dashboard`, `stats`, `settings`) are thin typed pass-throughs to the upstream `new-api` backend via Orval-generated clients. The `chat` vertical is the exception: it owns its own Turso DB (conversations, messages, shared links) and its own logic (streaming, media, title generation, web search, video tasks).

- **BFF routes** (`src/app/api/[[...route]]/route.ts`, Elysia): mount all `src/server/<feature>/route.ts` under `/api`. Request ID + duration logging on every request, structured error taxonomy at the boundary.
- **Upstream client:** `src/openapi.ts` (Orval-generated, never edit). Use `deriveUpstream` + `unwrap(res)` to forward.
- **Local DB (chat only):** Turso/libSQL via Drizzle ORM. Schema in `src/lib/db/schema.ts`, client in `src/lib/db/client.ts`. Auto-migrates on first `getDb()` call.
- **Client state:** Jotai (UI + cookie-backed persistence via `atomWithStorage` + `jotaiCookieStorage`).
- **Server state:** React Query 5. Mutations use `setQueryData` + pure cache helpers, not `invalidateQueries`.
- **Type pipeline:** `TypeBox schema → Elysia validation → Eden Treaty RPC → handleElysia() → React Query hook`.
- **i18n:** next-intl, `en` + `de` in `public/i18n/`. `proxy.ts` handles locale middleware.
- **Media:** Cloudflare R2 via AWS SDK, helpers in `src/lib/config/r2.ts`.
- **Search:** Orama, index pregenerated at build time (`scripts/generate-search-index.ts`).
- **Observability:** Pino logger (`src/lib/utils/logger.ts`, always include `context` field). PostHog server + client via `src/instrumentation.ts` / `src/instrumentation-client.ts`.
- **Auth:** upstream-driven OAuth. App sets `access_token` (httpOnly) + `user-id` cookies after callback. Turnstile on login/register.

## Route return conventions

Two patterns, pick by vertical:

- **Pass-through verticals** (`billing`, `auth`, `token`, `affiliate`, `logs`, `pricing`, `dashboard`, `stats`, `settings`, `badge`): `return unwrap(res)` — the upstream response shape flows through. No wrapping.
- **Local-logic vertical** (`chat`): `return { success: true, data }` — wrapping is needed so `handleElysia()` on the client can distinguish success from typed failure.

Stick to the pattern of the vertical you're editing. Don't mix.

## Validation file layout

Two TypeBox folders, by route type:

- `src/lib/validation/` — schemas for the `chat` vertical (local DB) and feature-specific validation (badge, media, etc.). Includes `helpers.ts` (`safeParse`).
- `src/lib/api/typebox/` — schemas for BFF pass-through verticals, mirror the upstream API surface.

## Rules

- **No prop destructuring** in function signatures. Use `props.field`. Exceptions: spreading, defaults.
- **Full translation keys** with UPPER_SNAKE nesting: `t("BILLING.CURRENT_BALANCE")`. Use `msg()` for non-React code.
- **Real translations** in every locale file. Never English placeholders for German.
- **Query keys** from `src/lib/react-query/keys.ts` only. Never raw string arrays.
- **Cache updates** via `setQueryData` + pure helpers (`src/lib/react-query/conv-cache.ts`). Avoid `invalidateQueries` / `refetch` in mutation hooks.
- **No `useMemo` / `useCallback`** — React 19 compiler handles memoization.
- **No dashes as punctuation** (em, en, `--`). Rephrase.
- **Named exports** for components. `"use client"` at the top of client components.
- **Kebab-case** file names. Suffixes: `*.service.ts`, `route.ts`, `*-hook.ts`, `*-store.ts`.

## Key patterns

**Elysia routes** (`src/server/<feature>/route.ts`): validate with TypeBox (`body:` / `query:`), derive upstream headers with `.derive(deriveUpstream)`, call either the Orval client (pass-throughs) or a local `*.service.ts` (chat). The Elysia root at `src/app/api/[[...route]]/route.ts` adds `requestId`, timing, and error taxonomy — **don't add try/catch in route handlers**, let the boundary handle it.

**Mutations** (client side): call Eden Treaty, unwrap with `handleElysia()`, use `handleError(e, t)` in `onError` for i18n toasts. Optimistic updates use `onMutate` with snapshot + rollback. Reference: `src/hooks/chat-hook.ts`.

**Jotai atoms**: `atomWithStorage` + `jotaiCookieStorage` for persistence. Derived atoms via `atom(getter, setter)`. For non-React callers (stream callbacks) that need synchronous access to current conversation state, use plain module variables in `src/store/chat-store.ts`.

**Server pages**: prefetch with `getQueryClient()` + `HydrationBoundary` / `dehydrate()`.

**Auth cookies** (`src/lib/config/constants.ts`):

- `access_token` — httpOnly, upstream API token, 30 day TTL
- `user-id` — readable by server handlers, used by `getUserId(cookie)` in `src/server/constants.ts`
- `client-store` — JSON, holds user's own API key (for direct `getApiKey(cookie)` use)
- Guest users fall back to `GUEST_API_KEY` via `getApiKeyOrGuest(cookie)`

## Type safety pipeline

```
TypeBox schema → Elysia validation → Eden Treaty RPC → handleElysia() → React Query hook
```

- `handleElysia()` / `unwrap()`: `src/lib/utils/base.ts`
- `handleError()`: `src/lib/utils/client.ts`
- Eden type helpers (`EdenArgs`, `EdenResponse`, `EdenQuery`): `src/lib/types/eden.ts`
- Upstream client: `src/openapi.ts` (Orval auto-generated, never edit; regenerate with `bun openapi`)

## Chat vertical specifics

The only vertical with real business logic. Files in `src/server/chat/`:

- `conversation.service.ts` — conversations CRUD, share links
- `message.service.ts` — message persistence, pending-usage buffering (`pendingUsageByConv`, TTL-swept on write)
- `stream.service.ts` — `streamText` from `ai` SDK, UI message stream wiring, web-search augmentation, media routing
- `media.service.ts` — R2 upload pipeline
- `task.service.ts` — async video task polling
- `title.service.ts` — auto-title generation
- `tavily.service.ts` — web search

Chat is the only place with local DB writes. Everything else reads/writes upstream.

## Route groups (app directory)

- `(auth)` — login, register
- `(chat)` — main chat UI, shared conversation view
- `(sidebar)` — dashboard, billing, settings, token, affiliate, logs
- `(navbar)` — marketing: pricing, models, blog
- `(docs)` — fumadocs-based docs for openclaw, codex, gemini-cli, claude-code, cc-switch
- `(legal)` — privacy, terms
