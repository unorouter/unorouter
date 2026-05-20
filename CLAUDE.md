Next.js 16 AI chat app. React 19, Tailwind v4, shadcn/ui. Elysia BFF in front of an upstream `new-api` service. Local-first chat: a client-side SQLocal/OPFS DB in the browser, with an optional server-side Turso mirror for synced conversations.

## Commands

```bash
bun dev:log          # dev server (logs to /tmp/next.log)
bun build            # production build. prebuild: search index + SEO timestamps + bundled migrations. postbuild: openapi refs
bun lint             # eslint
bun prettier         # format the repo
bun openapi          # regenerate openapi.ts from upstream spec (Orval)
bun db:generate      # drizzle-kit generate (server + client configs) then bundle migrations
bun db:reset         # reset local chat DB (drizzle/reset-db.ts)
```

Other scripts in `scripts/`: `generate-search-index.ts`, `generate-seo-timestamps.ts`, `bundle-migrations.ts`, `generate-openapi-refs.ts`, `generate-web-bot-auth-key.ts`, `lighthouse.ts`, `indexnow.ts`.

NEVER start, restart, or kill the dev server. Read `/tmp/next.log` for errors. Use browser MCP to inspect.

## Architecture

This is a BFF (backend-for-frontend), not a full-stack ledger. Most server routes are thin typed pass-throughs to the upstream `new-api` backend via Orval-generated clients. The `ai/chat` vertical is the exception: it owns real local logic (streaming, prompt assembly, media, moderation, title generation, web search, video tasks, conversation import/export, RP entities).

Server routes are grouped into 5 domains under `src/server/`, each with a `route.ts` that mounts its subroutes:

- `ai/`: `chat/` (real logic), `playground/`, `sync/`
- `auth/`: `account/`, `settings/`, `web-bot-auth/`
- `billing/`: `core/`, `affiliate/`, `checkout-sessions/`, `dashboard/`, `token/`
- `models/`: `model-status/`, `perf-metrics/`, `pricing/`, `rankings/`
- `ops/`: `badge/`, `health/`, `logs/`, `stats/`

`src/server/constants.ts` holds shared server helpers (`getUserId`, `getApiKey`, `deriveUpstream`, `ADMIN_HEADERS`). `src/server/env.ts` reads + validates required env vars (fails fast at module load).

- BFF entrypoint (`src/app/api/[[...route]]/route.ts`, Elysia): mounts the 5 domain routes (`aiDomainRoute`, `authDomainRoute`, `billingDomainRoute`, `modelsDomainRoute`, `opsDomainRoute`) plus `webBotAuthPlugin`. Request ID and duration logging on every request, structured error taxonomy at the boundary.
- Upstream client: `src/openapi.ts` (Orval-generated, never edit). Use `deriveUpstream` and `unwrap(res)` to forward.
- Databases: two DBs, both Drizzle ORM.
  - Server: Turso/libSQL. Client in `src/lib/db/server/client.ts` (`getDb()`). Migrations + seeds run fire-and-forget at first `getDb()` call (skipped during build); the first request can race ahead of a cold-start migration. Holds the synced mirror for logged-in users.
  - Client: SQLocal over OPFS (browser). Client in `src/lib/db/client/client.ts` (`getLocalDb(userId)`, per-user OPFS file). Owns the local-first chat state; guest conversations live only here.
  - Shared schema: `src/lib/db/schema/` (`shared.ts` = both, `server.ts` = server-only, `client.ts` = client-only, `index.ts` = server build entrypoint).
- Client state: Jotai (UI plus cookie-backed persistence via `atomWithStorage` and `jotaiCookieStorage`).
- Server state: React Query 5. Mutations use `setQueryData` plus pure cache helpers, not `invalidateQueries`.
- Type pipeline: TypeBox schema, Elysia validation, Eden Treaty RPC, `handleElysia()`, React Query hook.
- i18n: next-intl. Locales in `public/i18n/`: `en`, `de`, `fr`, `ja`, `ru`, `vi`, `zh-CN`, `zh-TW`. `src/proxy.ts` handles locale middleware.
- Media: Cloudflare R2 via AWS SDK, helpers in `src/lib/config/r2.ts`.
- Search: Orama, index pregenerated at build time (`scripts/generate-search-index.ts`).
- SEO: `src/lib/seo/` (`metadata.ts`, `structured-data.ts`, `json-ld.tsx`, `docs-schema.tsx`, `timestamps.ts`). Build-time timestamps via `scripts/generate-seo-timestamps.ts`.
- Observability: Pino logger (`src/lib/utils/logger.ts`, always include `context` field). PostHog server and client via `src/instrumentation.ts` and `src/instrumentation-client.ts`.
- Auth: upstream-driven OAuth. App sets `access_token` (httpOnly) and `user-id` cookies after callback. Turnstile on login and register.

## Route return conventions

Two patterns, pick by domain:

- Pass-through routes (`auth`, `billing`, `models`, `ops`, plus `ai/playground` and `ai/sync` where they forward): `return unwrap(res)`. The upstream response shape flows through. No wrapping.
- Local-logic routes (`ai/chat`, including its `rp` and `transfer` subroutes): `return { success: true, data }`. Wrapping is needed so `handleElysia()` on the client can distinguish success from typed failure.

Stick to the pattern of the route you're editing. Don't mix.

## Validation file layout

Two TypeBox folders, by route type:

- `src/lib/validation/`: schemas for the `ai/chat` vertical (local DB) and feature-specific validation (badge, media, etc.). Includes `helpers.ts` (`safeParse`).
- `src/lib/api/typebox/`: schemas for BFF pass-through routes, mirror the upstream API surface.

## Rules

- No prop destructuring in function signatures. Use `props.field`. Exceptions: spreading, defaults.
- Full translation keys with UPPER_SNAKE nesting: `t("BILLING.CURRENT_BALANCE")`. Use `msg()` for non-React code.
- Real translations in every locale file. Never English placeholders for other languages. Chinese files use full-width punctuation.
- Query keys from `src/lib/react-query/keys.ts` only. Never raw string arrays.
- Cache updates via `setQueryData` plus pure helpers (`src/lib/react-query/conv-cache.ts`, `cache-helpers.ts`). Avoid `invalidateQueries` and `refetch` in mutation hooks.
- No `useMemo` or `useCallback`. React 19 compiler handles memoization.
- No dashes as punctuation (em, en, `--`). Rephrase.
- Named exports for components. `"use client"` at the top of client components.
- Kebab-case file names. Suffixes: `*.service.ts`, `route.ts`, `*-hook.ts`, `*-store.ts`.
- Client local-DB functions accept `userId?: number` (or `number | undefined` when a required param follows), defaulting to `GUEST_USER_ID`. Hooks resolve `auth.data?.id ?? GUEST_USER_ID` because guest-vs-synced branching (`userId > GUEST_USER_ID`, `mirrorConvIfSynced`) needs a concrete id. Never the magic literal `0`.
- Dates via `dayjs` (shared singleton, `src/lib/utils/format/date.ts`), not raw `Date` or `toLocaleDateString`.
- Enum-like types use a TypeBox union or an `as const` array plus a derived type. No TS `enum` keyword.

## Key patterns

Elysia routes (`src/server/<domain>/<feature>/route.ts`): validate with TypeBox (`body:` and `query:`), derive upstream headers with `.derive(deriveUpstream)`, call either the Orval client (pass-throughs) or a local `*.service.ts` (chat). The Elysia root at `src/app/api/[[...route]]/route.ts` adds `requestId`, timing, and error taxonomy. Don't add try/catch in route handlers; let the boundary handle it.

Hooks (`src/hooks/`): feature-grouped into `ai/`, `auth/`, `billing/`, `models/`, `ops/`, `ui/`. Mutations call Eden Treaty, unwrap with `handleElysia()`, use `handleError(e, t)` in `onError` for i18n toasts. Optimistic updates use `onMutate` with snapshot and rollback. Reference: `src/hooks/ai/chat-hook.ts`.

Jotai atoms: `atomWithStorage` plus `jotaiCookieStorage` for cookie persistence. Derived atoms via `atom(getter, setter)`. The chat store (`src/store/chat-store.ts`) exposes a shared store instance `chatStore`; non-React callers (stream callbacks) read/write atoms synchronously via `chatStore.get(atom)` / `chatStore.set(atom, value)`.

Server pages: prefetch with `getQueryClient()` plus `HydrationBoundary` and `dehydrate()`.

Auth cookies (`src/lib/config/constants.ts`):

- `access_token`: httpOnly, upstream API token, 30 day TTL
- `user-id`: signed via iron-session (`signUserId`/`verifyUserId` in `src/lib/utils/server.ts`), readable by server handlers, used by `getUserId(cookie)` in `src/server/constants.ts`. Requires `SESSION_SECRET` (>= 32 chars).
- `client-store`: JSON (`CLIENT_STORE_KEY`), holds the user's own API key (for direct `getApiKey(cookie)` use)
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

The only vertical with real business logic, under `src/server/ai/chat/`. Organized into core plus three subfolders:

Core (`src/server/ai/chat/`):

- `route.ts`: chat root route, mounts subroutes
- `conversation.service.ts`: conversations CRUD, share links
- `message.service.ts`: message persistence, branch/active-branch handling, pending-usage buffering (`pendingUsageByConv` module Map, swept on write via `sweepStalePending`)
- `stream.service.ts`: `streamText` from `ai` SDK, UI message stream wiring. Streams pass `body.chatContext` from the client IDB so logged-in streams skip Turso RP reads; Turso `loadConvContext` is the fallback for guests, legacy, and the share page.

Augmentation (`src/server/ai/chat/augmentation/`): pipeline pieces the stream service composes.

- `prompt-assembler.service.ts`: assembles the final prompt (system, persona, lorebook, history) before stream
- `media.service.ts`: R2 upload pipeline
- `moderation.service.ts`: content moderation gate
- `task.service.ts`: async video task polling
- `title.service.ts`: auto-title generation
- `tavily.service.ts`: web search

RP (`src/server/ai/chat/rp/`): roleplay entity services.

- `route.ts`: RP subroute, mounted under chat
- `character.service.ts`, `persona.service.ts`, `lorebook.service.ts`, `preset.service.ts`
- `card.service.ts`: SillyTavern character card import/export
- `binding.service.ts`: links characters/personas/presets/lorebooks to a conversation
- Import/serialization helpers live in `src/lib/rp/`: `character-card.ts` (SillyTavern card v2/v3), `persona-import.ts`, `lorebook-import.ts`.

Conversation export/import is local-first, not a server route. The logic lives in `src/lib/db/client/data/transfer.ts` (`exportLocalConversation`, `exportLocalConversationSillyTavern`, `importLocalConversation`) and reads/writes the client SQLocal DB directly via `readLocalConversationBundle` / `upsertLocalConversationBundle`. Formats: `unorouter.1.0` native, `orpg.3.0`, SillyTavern JSONL. Works for guests since it never touches Turso.

The server `ai/chat` services are the only place with server (Turso) DB writes. The browser-side local-first chat state lives in the client SQLocal DB (`src/lib/db/client/`).

## Other server domains

- `ops/badge/`: dynamic SVG/PNG badge rendering with Satori. Templates and elements live next to the route.
- `billing/checkout-sessions/`: payment session creation with idempotency and typed error taxonomy.
- `ops/health/`: simple health probe.
- `models/model-status/`: pass-through for upstream model availability/status checks. Hook: `src/hooks/models/model-status-hook.ts`. Store: `src/store/status-store.ts`.
- `auth/web-bot-auth/`: verified bot signature auth. Route plus `keys.ts` and `verify-inbound.ts`; the BFF mounts `webBotAuthPlugin`. Shared logic in `src/lib/web-bot-auth/`.
- `ai/playground`, `ai/sync`: playground generation and the conversation sync endpoint.

## Route groups (app directory)

Locale-prefixed groups under `src/app/[locale]/`:

- `(auth)`: login, register
- `(chat)`: main chat UI (`chat/`, with nested `cards/`, `presets/`, `[convId]/`)
- `(playground)`: playground UI (`playground/`, `playground/[id]`)
- `(sidebar)`: dashboard, billing, settings, token, affiliate, logs
- `(navbar)`: marketing surface. Contains `(home)`, `pricing`, `models` (`[slug]`), `blog`, `rankings`, and nested `(legal)` (privacy, terms).
- `(docs)`: fumadocs-based docs, split into:
  - `(cli)`: openclaw, codex, gemini-cli, claude-code, cc-switch
  - `(rp)`: chub, janitor-ai, risuai, sillytavern
- `(status)`: model status page (`status/`), backed by the `models/model-status` route
- `consent/`: cookie/consent flow (not a route group, plain segment)

Non-locale segments under `src/app/`:

- `(discovery)`: static SEO surface (humans.txt, llms.txt, openapi.json, robots.txt, `.well-known/`)
- `api/[[...route]]`: Elysia BFF entrypoint
- `sqlocal/`: SQLocal/OPFS worker assets
