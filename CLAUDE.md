> **Maintenance:** Always update this file when adding/removing/renaming routes, services, schema tables, hooks, stores, providers, factories, env vars, validation enums, sync kinds, well-known endpoints, background jobs, or any pattern/invariant referenced here. Drift makes this file actively misleading. If a change makes a section here wrong, fix the section in the same commit.

Next.js 16 AI chat + image/video generation app. React 19 compiler, Tailwind v4, shadcn/ui. Elysia BFF in front of an upstream `new-api` service. Local-first: a per-user SQLocal/OPFS DB in the browser is the source of truth for chat/playground/RP state; an optional Turso mirror syncs selected rows across devices.

## Commands

```bash
bun dev:log          # dev server (logs to /tmp/next.log)
bun build            # production build. prebuild: search index + SEO timestamps + bundled migrations. postbuild: openapi refs
bun lint             # eslint
bun prettier         # format the repo
bun openapi          # regenerate openapi.ts from upstream spec (Orval)
bun db:generate      # drizzle-kit generate (server + client configs) then bundle migrations
bun db:reset         # wipe Turso + R2 prefixes (drizzle/reset-db.ts; reads R2_* + TURSO_* env)
```

Scripts in `scripts/`: `generate-search-index.ts` (Orama index from registry), `generate-seo-timestamps.ts` (`git log` per registry contentFiles into `public/seo-timestamps.json`), `bundle-migrations.ts` (writes `src/lib/db/client/schema-migrate/migrations.json`), `generate-openapi-refs.ts` (writes `.next/.openapi-types/references.json`), `generate-web-bot-auth-key.ts` (mints `WEB_BOT_AUTH_PUBLIC_JWKS` + `WEB_BOT_AUTH_PRIVATE_JWK` env values), `lighthouse.ts`.

Drizzle outputs: `drizzle/server/` (Turso migrations + meta), `drizzle/client/` (SQLocal migrations + meta consumed by `bundle-migrations.ts` -> `migrations.json` -> runtime `runMigrations`).

NEVER start, restart, or kill the dev server. Read `/tmp/next.log` for errors. Use browser MCP to inspect.

## Architecture

BFF in front of upstream `new-api`. Most server routes are thin typed pass-throughs via Orval-generated clients. `ai/chat` + `ai/playground` + `ai/sync` own real local logic. RP entity routes are READ-ONLY; all mutations happen client-side against SQLocal and mirror to Turso via `/sync/:kind/:id`.

Server routes grouped into 5 domains under `src/server/`:

- `ai/`: `chat/` (streaming + prompt assembly), `playground/` (image/video gen), `sync/`
- `auth/`: `account/`, `settings/`, `web-bot-auth/`
- `billing/`: `core/`, `affiliate/`, `checkout-sessions/` (ACP), `dashboard/`, `token/`
- `models/`: `model-status/`, `perf-metrics/`, `pricing/`, `rankings/`
- `ops/`: `badge/` (Satori SVG), `health/`, `logs/`, `stats/`

`src/server/constants.ts` holds `getUserId/getApiKey/getApiKeyOrGuest/deriveUpstream/ADMIN_HEADERS`. `src/server/env.ts` reads + validates required env vars; fails fast at module load when `SYSTEM_ACCESS_TOKEN` or `SESSION_SECRET` is missing or `SESSION_SECRET` is too short (< 32 chars).

- BFF entrypoint (`src/app/api/[[...route]]/route.ts`, Elysia): mount order = openapi plugin, then `webBotAuthPlugin` (populates `verifiedAgent`), then 5 domain routes. No requestId/timing/error middleware at root; `x-request-id` is forwarded by `deriveUpstream` when the caller supplies it. Openapi root carries MPP `x-service-info` annotations.
- Upstream client: `src/openapi.ts` (Orval-generated, ~17k LOC, never edit). Mutator `src/lib/custom-fetch.ts`.
- Two DBs, both Drizzle ORM / SQLite dialect:
  - Server: Turso/libSQL. `src/lib/db/server/client.ts` `getDb()`. Lazy. First call runs `migrate()` + `runSeeds()` fire-and-forget (skipped when `serverEnv.standalone`). First request can race a cold-start migration.
  - Client: SQLocal over OPFS, lazy WASM import (~1.5MB). `src/lib/db/client/client.ts` `getLocalDb(userId)`, per-user OPFS file `${appName}-${userId}.sqlite3`. Per-userId promise cache. Releases SyncAccessHandle on `pagehide`/`beforeunload`. Dev-only salvage: failed migration opens a fresh DB at a temp path, copies surviving rows via `copyAllTables`, overwrites the original file. Prod rethrows.
  - Shared schema: `src/lib/db/schema/` (`shared.ts` = both, `server.ts` = server-only, `client.ts` = client-only, `rows.ts` = canonical `$inferSelect` row types, `index.ts` = server build entrypoint).
- Client state: Jotai (cookie-persistence via `atomWithStorage` + `jotaiCookieStorage`). Plus an in-memory `chatStore = createStore()` exposed for non-React callers.
- Server state: React Query 5. Hooks read the local SQLocal DB, then mirror to Turso when `syncExpiresAt != null`. Invalidation is cheap since queries hit local DB.
- Type pipeline: TypeBox schema, Elysia validation, Eden Treaty RPC, `handleElysia()`, React Query hook.
- i18n: next-intl. 18 locales in `public/i18n/`: `ar/de/en/es/fr/he/hi/id/it/ja/ko/pl/pt-BR/ru/tr/vi/zh-CN/zh-TW`. `src/proxy.ts` runs next-intl middleware + stamps COEP/COOP/CORP on infra prefixes. `src/i18n/routing.ts` carries per-locale translated `pathnames` for every static + dynamic route (e.g. `/models` becomes `/modelle/moderu/модели/...`). ICU messages are PRECOMPILED at build (`experimental.messages.precompile` in `next.config.ts`); `t.raw` is therefore unsupported repo-wide. Client message payload is pruned by `src/i18n/client-messages.ts` (`pruneClientMessages` in `LanguageProvider` strips TERMS/PRIVACY/WELL_KNOWN/BLOG.POSTS and reduces DOCS to an allowlist + per-guide TITLE/SUBTITLE leaves); `ClientIntlProvider` THROWS on `MISSING_MESSAGE` in dev (red overlay on first render) so a client component referencing a stripped or missing key can't go unnoticed. Decorative one-off client islands (e.g. homepage floating chips) get translated strings as props from server parents instead. Interim until next-intl ships automatic message tree-shaking (amannn/next-intl#1).
- Media: Cloudflare R2 via AWS SDK + SSRF-safe undici fetch (CIDR allowlist, DNS filtering, magic-byte verification, 50MB download cap, 100MB per-user quota, port allowlist). `src/lib/config/r2.ts`.
- Search: Orama, index pregenerated at build via `scripts/generate-search-index.ts` from `DOCS_REGISTRY/BLOG_REGISTRY` in `src/i18n/registry.ts`.
- SEO: `src/lib/seo/` (`metadata.ts` includes inline timestamp loader, `structured-data.ts`, `json-ld.tsx`). Build-time timestamps via `scripts/generate-seo-timestamps.ts` running `git log` per registry `contentFiles`.
- Observability: Pino logger (`src/lib/utils/logger.ts`, always include `context` field). PostHog server via `src/instrumentation.ts` `onRequestError` (prod only, extracts distinctId from `ph_phc_*_posthog` cookie). PostHog client via `src/instrumentation-client.ts`.
- Auth: upstream-driven OAuth + email/password. App sets `access_token` (httpOnly) and signed `user-id` cookies after callback. Turnstile on login/register.
- COEP isolation: chat + playground layouts get COEP `require-corp` / COOP `same-origin`. `proxy.ts` runtime-stamps headers (dev/turbopack bypasses `next.config.ts` `headers()`): `ISOLATED_PATHS` (`/_next/`, `/api/`, `/sqlocal/`) get CORP `same-origin` + COEP `require-corp` + COOP `same-origin`; `PUBLIC_CROSS_ORIGIN` (`/api/ops/badge`) gets CORP `cross-origin` so third-party sites can embed badges.
- PWA / offline: Serwist via `@serwist/turbopack` (the webpack `@serwist/next` no-ops under Next 16's Turbopack build). The SW is SERVED BY AN APP ROUTE, not a `public/sw.js` file: `src/app/sw-worker/[path]/route.ts` calls `createSerwistRoute({ swSrc: "src/app/sw.ts" })` and serves the bundled worker + chunks at `/sw-worker/sw.js`. The route is `force-dynamic` + `revalidate: 0` (the factory's default `force-static` makes Next emit `s-maxage=1yr`, which once poisoned the Cloudflare edge cache un-purgeably; hence force-dynamic + a `no-cache` header on `/sw-worker/*` in both `next.config.ts` and `proxy.ts`, and the path moved off the poisoned `/serwist/`). `next.config.ts` wraps with `withSerwist` (marks esbuild as a server-external package). SW source is `src/app/sw.ts` (worker exports from `@serwist/turbopack/worker`); `navigationPreload` is OFF so navigations route through the SW fetch and the offline fallback fires deterministically. A raw `fetch` listener in `sw.ts` calls `stopImmediatePropagation` for worker/sharedworker/wasm/sqlocal requests so SQLocal's OPFS async-proxy worker (SharedArrayBuffer + Atomics.wait) is never intercepted (else OPFS persistence times out). Registered manually by `src/components/provider/app/sw-register.tsx` at `/sw-worker/sw.js` scope `/` (route sets `Service-Worker-Allowed: /`), mounted in `[locale]/layout.tsx`, prod-only. `proxy.ts` has an early `/sw-worker/` bypass (skips next-intl locale rewrite, adds CORP + no-cache). SW caching is COEP-safe: every runtime matcher is gated on `sameOrigin` (those `_next/static` + `/api` responses already carry CORP `same-origin`); `/api/*` + `/sqlocal/*` are `NetworkOnly`; navigations are `NetworkFirst` with NO networkTimeoutSeconds (a timeout served the PREVIOUS build's HTML on slow links, 404ing its chunks after deploys and killing all event handlers) and `/en/offline` (`src/app/[locale]/offline/page.tsx`, static, no auth/SQLocal; registered in `routing.ts` pathnames + privateRoutes) as the document fallback. Manifest (`[locale]/manifest.webmanifest`) + icons + `metadata.ts` wiring predate this. Build-scoped runtime caches (`pages`, `pages-rsc`, `pages-rsc-prefetch`, `others`) are wiped in the SW `activate` handler so a new deploy can never mix cached HTML/RSC from an old build with new chunks. Works offline for guests + logged-in (local-first reads need no network).

## Route return conventions

Two patterns, pick by domain:

- Pass-through routes (`auth`, most of `billing`, `models`, `ops/logs`, `ops/stats`, `models/*`): `return unwrap(res)`. Upstream response shape flows through.
- Local-logic routes (`ai/chat`, `ai/playground`, `ai/sync`, `ops/health`, `ops/stats`, `billing/checkout-sessions`): `return { success: true, data }`. Wrapping is needed so `handleElysia()` on the client can distinguish success from typed failure.

Stick to the pattern of the route you're editing. Don't mix.

## Validation file layout

Two TypeBox folders, by route type:

- `src/lib/validation/`: schemas for the `ai/chat`/`ai/playground`/`ai/sync` verticals (local DB), badge, media, settings, RP forms. `helpers.ts` holds `safeParse` + `formDefaults`; the narrowing helpers (`narrowReasoningEffort`, `narrowWebSearchEngine`, `narrowWebSearchContextSize`, `parseExtraBody`) live in `chat.ts`.
- `src/lib/api/typebox/`: schemas for BFF pass-through routes; mirrors the upstream API surface.

## Rules

- No prop destructuring in function signatures. Use `props.field`. Exceptions: spreading, defaults.
- Full translation keys with UPPER_SNAKE nesting: `t("BILLING.CURRENT_BALANCE")`. Use `msg()` for non-React code.
- Real translations in every locale file. Never English placeholders. Chinese files use full-width punctuation.
- Query keys from `src/lib/react-query/keys.ts` only. Never raw string arrays.
- After a mutation writes the local DB, `invalidateQueries` so the affected queries refetch from it. No network round-trip, so no need for `setQueryData` cache patches or optimistic rollback.
- No `useMemo` or `useCallback`. React 19 compiler handles memoization.
- No dashes as punctuation (em, en, `--`). Rephrase.
- Named exports for components. `"use client"` at the top of client components.
- Kebab-case file names. Suffixes: `*.service.ts`, `route.ts`, `*-hook.ts`, `*-store.ts`, `*-adapter.ts`.
- Client local-DB functions accept `userId?: number` (or `number | undefined` when a required param follows), defaulting to `GUEST_USER_ID`. Hooks resolve `auth.data?.id ?? GUEST_USER_ID` because guest-vs-synced branching (`userId > GUEST_USER_ID`, `mirrorConvIfSynced`) needs a concrete id. Never the magic literal `0`.
- Dates via `dayjs` (shared singleton, `src/lib/utils/format/date.ts`; plugins extended once at server entry via `instrumentation.ts` and once at client entry via root layout). Never raw `Date` or `toLocaleDateString`.
- Enum-like types use a TypeBox `t.Union([t.Literal(...)])` plus a derived type. No new TS `enum` keyword anywhere. The only TS `enum` block lives in `src/lib/types/enums.ts` (`StoreId/ModelTypeFilter/Vendor/OS/DataTableId`) and is grandfathered; don't add to it.
- Drizzle text columns narrow via `.$type<>()` from those validation-derived literal-union types.
- No `sql.transaction()` wrappers in client SQLocal code. The transactionMutex deadlocks every later DB call if any statement throws. Use bare exec loops + `ON CONFLICT DO NOTHING` (see `replaceChildRows`, `runMigrations`, `copyAllTables`).

## Key patterns

Elysia routes (`src/server/<domain>/<feature>/route.ts`): validate with TypeBox (`body:` / `query:` / `params:`), derive upstream headers with `.derive(deriveUpstream)`, call either the Orval client (pass-throughs) or a local `*.service.ts` (chat/playground/sync/billing checkout). No try/catch in route handlers.

Hooks (`src/hooks/`): feature-grouped into `ai/`, `auth/`, `billing/`, `models/`, `ops/`, `ui/`. Mutations call Eden Treaty, unwrap with `handleElysia()`, use `handleError(e, t)` in `onError` for i18n toasts.

`makeRpEntity` (`src/hooks/ai/rp/factory.ts`): generic `<TItem, TCreateBody, TUpdateBody>` that emits `{useList, useItem, useCreate, useUpdate, useDelete}`. Each mutation writes local first, mirrors via `mirrorSyncedRow`/`deleteSyncedRow` when `syncExpiresAt != null`, queues a `local_pending_sync` row on RPC failure, invalidates list/item keys. The single source of CRUD for characters/personas/lorebooks/presets/cards.

`makeTableStore` (`src/lib/db/client/data/table-store.ts`): Drizzle wrapper emitting `{list, get, upsert, drop}` for any SQLocal table. `scopeUser` toggle ANDs `eq(table.userId, uid)` into WHERE and merges userId into upsert rows; tables without a `userId` column (`conversationSettings`, `messages`, etc.) pass `scopeUser: false`.

`replaceChildRows` (`src/lib/db/client/data/table-store.ts:28`): FK-scoped delete + insert loop. NO transaction wrapper. `mergeChildRows` (same file, line 57) is the upsert sibling: per-row PK `ON CONFLICT` so existing siblings survive (used on sync-pull of child arrays).

Jotai atoms: `atomWithStorage` plus `jotaiCookieStorage` for cookie persistence. Derived atoms via `atom(getter, setter)`. The chat store (`src/store/chat-store.ts`) exposes a shared store instance `chatStore`; non-React callers (stream callbacks, `confirm()`, the `thread.tsx` runtime bridge) read/write atoms synchronously via `chatStore.get(atom)` / `chatStore.set(atom, value)`. `chatStoreAtom` has no `getOnInit` so SSR and the first client render don't diverge; selector atoms fall back to INITIAL state per field (cookie-schema-drift defense).

Server pages: prefetch with `getQueryClient()` plus `HydrationBoundary` and `dehydrate()`. Cookies pre-read on the server via `getCookieValue<T>` + `use()` and passed into store providers.

Auth cookies (`src/lib/config/constants.ts` for names; `src/store/client-store.ts` for `CLIENT_STORE_KEY`):

- `access_token`: httpOnly, upstream API token, 30 day TTL
- `user-id`: signed via iron-session (`signUserId`/`verifyUserId` in `src/lib/utils/server.ts`), readable by server handlers, used by `getUserId(cookie)` in `src/server/constants.ts`. Requires `SESSION_SECRET` (>= 32 chars).
- `client-store`: JSON (`CLIENT_STORE_KEY`, owned by `src/store/client-store.ts`), holds the user's own API key (for direct `getApiKey(cookie)` use). Server imports the key constant from the store module.
- Guest users fall back to `serverEnv.guestApiKey` via `getApiKeyOrGuest(cookie)`.

## Type safety pipeline

```
TypeBox schema -> Elysia validation -> Eden Treaty RPC -> handleElysia() -> React Query hook
```

- `handleElysia()` and `unwrap()`: `src/lib/utils/base.ts`
- `handleError()`: `src/lib/utils/client.ts` (also installs a TypeBox `SetErrorFunction` so `t.String({ error: "..." })` carries through)
- Eden type helpers (`EdenArgs`, `EdenQuery`): `src/lib/types/eden.ts`
- Upstream client: `src/openapi.ts` (Orval auto-generated, never edit; regenerate with `bun openapi`)

## Chat vertical specifics

The only vertical with real business logic, under `src/server/ai/chat/`. Core + `augmentation/` subfolder.

Core (`src/server/ai/chat/`):

- `route.ts`: chat root route, mounts subroutes. Exposes `GET conversations/:id/meta/markdown`, `POST title/stream`, `GET task/:taskId`, `POST :id/task/finalize`. No POST/PATCH/DELETE for conversation or messages: those live in client hooks (`src/hooks/ai/chat-hook.ts`) writing the local SQLocal DB.
- `conversation.service.ts`: paginated messages + conversation reads (Turso). `getConversationMarkdown` walks the active branch.
- `stream.service.ts` + `stream/`: `stream.service.ts` is slim `streamChat`. Helpers split into `stream/transforms.ts` (PDF inline, depth splicing, macro expansion, role transforms, gemini safety, recent-user-text) and `stream/media-stream.ts` (image gen, image/video stream handlers, URL rehost, buffered stream). `streamText` from the `ai` SDK, UI message stream wiring. Streams pass `body.chatContext` from the client IDB so logged-in streams skip Turso RP reads; Turso `loadConvContext` is the fallback for guests and legacy synced rows. Branches on `isMediaModel(body.model)`: text streams (default), image (synchronous + R2 upload + buffered markdown), video task (`data-task` part client polls + finalizes). `maxRetries: 0` so upstream errors surface verbatim. Free models capped at `FREE_MODEL_OUTPUT_CAP=8192`. PDF parts pointing at R2 get inlined as text from `media.extractedText`; missing extraction inserts a `[Attached PDF "name": extraction unavailable]` placeholder (no throw). Output URLs (image/video) get rehosted to R2 by `processUrls`. Token usage rides on the `finish` stream-part via `messageMetadata({ part })`; the client's history adapter reads `message.metadata.usage` and bumps `conversations` totals.
- Message-shape pipeline lives in `src/lib/ai/chat/messages.ts` (`partsToItems`/`itemsToParts`). Maps ai-sdk `tool-invocation` (state-based: call vs result) to typed DB rows `tool_call`/`tool_result`. `data-task` part bidirectional with `task` DB type. `file` and `source-url` map to `file`/`image`.

Augmentation (`src/server/ai/chat/augmentation/`): pipeline pieces the stream service composes. All 5 services live here.

- `prompt-assembler.service.ts` + `prompt-assembler/`: `prompt-assembler.service.ts` holds `assembleForStream` + `assembleFromOverrides` + `AssembledSystem` type + `expandTemplateVars`. Split: `prompt-assembler/conv-context.ts` (`loadConvContext`, `buildContextFromClient`), `prompt-assembler/lorebook.ts` (`keyHits`, `selectLorebookEntries`, matching). Section order: `main_prompt -> system_fallback -> top entries -> before_char entries -> per-character blocks -> persona -> after_char entries -> systemPromptOverride||primary.systemPrompt -> primary.postHistoryInstructions -> preset.postHistory -> bottom entries`. `at_depth` entries return as `DepthInjection[]` spliced into messages by `spliceDepthInjections` in stream/transforms. Multi-character: primary character drives `{{char}}`; non-primary chars with `alwaysActive=false` are trigger-gated via `triggers` + `matchWholeWords`. Lorebook entry selection: per-book `scanDepth` + `tokenBudget` (gpt-tokenizer estimate), `MAX_RECURSIVE_LOREBOOK_PASSES=3` when `recursiveScanning=true`, whole-word matching via word-boundary regex. `extraBody` from settings beats preset on key clash; sliders + reasoning then win over both in providerOptions.
- `moderation.service.ts`: Creem prompt-moderation gate (`MODERATION_TIMEOUT_MS=5s`, env-gated via `CREEM_MODERATION_ENABLED`). Persists every `allow|flag|deny|error` decision to the server-only `moderation_log` table. `assertPromptAllowed` runs before image/video generation only.
- `task.service.ts`: async video task submit/poll. `finalizeVideoTask` rewrites the persisted `task` message_item to a `text` item with an R2-hosted `![video](url)` markdown line.
- `title.service.ts`: stateless title gen. Races `FREE_MODEL_RACE_COUNT=5` free text models via `Promise.any` (`generateText({ maxOutputTokens: 30 })`); truncates to ~60 chars on race failure. The client persists.
- `tavily.service.ts`: web search. Free-model race classifier (`needsWebSearch`, 3-token output, fail-closed) gates a Tavily API call (5s abort, max 5 results). Guest streams force `webSearch=false` (paid-only).

Stream-order rules (LOCKED, see comment at `stream.service.ts:159`): 1) `noSystemRole` BEFORE merge so the stripped system-as-user is eligible to collapse. 2) `prefill` BEFORE merge so a trailing assistant prefill can collapse with an existing trailing assistant; `skipPrefillIfLastIsAssistant` opts out when the last message is already assistant, honored independently of `forceAlternateRoles` (was previously an AND of both, which made the flag a no-op alone). 3) `mergeAlternateRoles` AFTER prefill to enforce strict user/assistant alternation for GLM/Anthropic. 4) `prependUserStub` LAST so merge cannot fold the stub.

Per-provider tweaks: `geminiBlockOff` sets all five Gemini safety categories to threshold `OFF`. `noSystemRole` rewrites system role to user with `[System]:` prefix for Gemini/GLM mid-conv. `stripSystemRole`, `mergeAlternateRoles`, `prependUserStub` are pure transforms on `body.messages`.

RP entities (characters, personas, lorebooks, presets, cards) are 100% local-first: zero server route surface. CRUD goes through `makeRpEntity` against SQLocal + mirrors via `/sync/:kind/:id`. Export is local too via `src/lib/db/client/data/rp-export.ts` (calls isomorphic helpers in `src/lib/ai/rp/`). Import/serialization helpers: `src/lib/ai/rp/` (`character-card.ts` SillyTavern card v2/v3 via `@character-foundry/character-foundry`, `persona-import.ts`, `lorebook-import.ts`).

Conversation export/import is local-first, not a server route. The logic lives in `src/lib/db/client/data/transfer/`: `native.ts` (`buildNativeExport`, `toOrpg`, `persistMappedImport`), `sillytavern.ts` (`exportLocalConversationSillyTavern`, `importSillyTavernChat`), `map.ts` (format mappers + ID remap on import). Reads/writes the client SQLocal DB directly. Formats: `unorouter.1.0` native, `orpg.3.0` (OpenRouter-compatible with `_unorouter_extension` for lossless extras), SillyTavern JSONL. Works for guests since it never touches Turso.

Playground session export/import lives in `src/lib/db/client/data/playground-transfer.ts` (`exportLocalSession`/`importLocalSession`). Envelopes: `unorouter-session-1` wrapping per-snapshot `unorouter-generation-1`. Image bytes inlined as base64 (fetched from R2 if not cached locally) so the file survives R2 expiry and works for guests.

## Chat runtime architecture (browser)

Under `src/components/pages/sidebar/chat/runtime/` (`ChatRuntimeProvider` mounted in `(chat)` layout). Bridges `@assistant-ui/react` to local-first storage:

- `chat-runtime-provider.tsx`: wraps tree with `AssistantRuntimeProvider`, drives a `useRemoteThreadListRuntime` and inner `useAISDKRuntime(useChat<ChatUIMessage>, { adapters: {attachments, history} })`. The transport is a `DefaultChatTransport` whose `body: async () => ({ model, convId, webSearch, overrides, chatContext })` reads live atoms via `chatStore.get` and builds `chatContext` from SQLocal via `buildChatContextFromLocalDb(userId, convId)`. `useChatHelpersBridge` publishes `setMessages/getMessages` via `chatHelpersAtom` so edit/delete in `thread.tsx` can drive `useChat` from outside the React tree. `useConvIdSync` mirrors the active thread's `remoteId` into `convIdAtom`. `useModelSync` is two-way: the server conv's model seeds `chatModelAtom` on thread load; later atom changes (model picker) push back via `useUpdateConversationMutation`.
- `chat-history-adapter.ts`: `ThreadHistoryAdapter`. `load()` serves from React Query cache if present, else from local SQLocal. `append()` persists the message row + items via `partsToItems`, derives usage from `message.metadata.usage` (written by the stream service `messageMetadata` callback), bumps conversation totals, invalidates queries, and calls `mirrorConvIfSynced`.
- `thread-list-adapter.ts`: pure local-first `RemoteThreadListAdapter`. `initialize` seeds new conv + settings row from `chatDefaultsAtom`. `rename`/`delete` use `mirrorConvPatchIfSynced` / `enqueuePending` on failure. `generateTitle` calls `POST /chat/title`, persists locally, mirrors patch if synced.
- `chat-utils.ts`: `createLocalAttachmentAdapter` writes file bytes as base64 into the local `media` table and returns `data:` URL parts. Conv id is pre-generated via `ensureConvId()` so the media row has a stable cascade parent.
- `guest-local-db-migrate.tsx`: one-shot post-login `migrateGuestLocalDb(userId)` call.

Send-failure semantics (Risu parity): NO auto-replay. Retries are bounded and live in the request layer only: `stream.service.ts` `streamText({ maxRetries: 2 })` retries RETRYABLE errors (429/5xx/network, exponential backoff); deterministic 4xx surface verbatim. On failure the user turn stays persisted (history adapter writes it on the failed-run transition) and the user resends manually; offline failures show `CHAT.QUEUED_OFFLINE` instead of a network error. Detection only, no replay: `findUnansweredUserTurns(userId)` in `src/lib/db/client/data/queued-send.ts` returns conversations whose active-branch leaf is a `role='user'` message with no active child + no later active sibling; `useQueuedSends` (query key `queuedSends`, invalidated by the history adapter `append`) feeds the sidebar "Queued" badge.

## Local-first DB layer

`src/lib/db/schema/shared.ts` (626 LOC): 18 tables mirrored client + server. Every syncable table carries `syncExpiresAt` (null = local-only; non-null = synced, Turso row is server-purged past the timestamp). Drizzle `.$type<>()` narrows text columns to validation-derived literal unions (`MessageRole`, `MessageItemType`, `ReasoningEffort`, `WebSearchEngine`, `WebSearchContextSize`, `LorebookEntryPosition`, `LorebookInjectionRole`, `UserTheme`, `GenerationStatus`, `PlaygroundVisibility`).

`src/lib/db/schema/server.ts`: server-only tables — `moderation_log`, `acp_checkout_sessions`, `acp_idempotency_keys` (`AcpIdempotencyState` narrowing), 3 catalogs (`lora/embedding/upscaler`).

`src/lib/db/schema/client.ts`: client-only — `local_pending_sync` (PK `(kind, id)`, `MAX_PENDING_ATTEMPTS=5` from `src/lib/db/client/sync/pending-sync.ts`, `SyncKindName` + `PendingSyncOp` narrowing) and `local_meta` KV (holds `migration_version` cursor). `LOCAL_ONLY_TABLES` excludes both from cross-DB copy/salvage.

`media` table has an ASYMMETRIC SYNC RULE: client writes `dataBase64` (and `r2Key`/`r2Url` stay null); the server's `sync.service` upload handler reads base64, uploads to R2, stamps `r2Key/r2Url`, and stores `dataBase64=null`. The hydrator's `rehydrateMedia` probes local first, fetches R2 only on first sight, and NEVER overwrites a present local cache (transient R2 failure preserves bytes).

`src/lib/db/client/schema-migrate/migrations.ts`: reads the bundled `migrations.json` manifest, enables `PRAGMA foreign_keys = ON`, then runs forward-only from `local_meta.migration_version`. Splits each migration on `--> statement-breakpoint`. NO `sql.transaction()` wrapper (transactionMutex deadlock if any statement throws).

`src/lib/db/client/data-migrate/copy.ts` `copyAllTables(source, target, opts)`: `PRAGMA foreign_keys = OFF` during copy, ON in finally. Column intersect drops drift silently. Uses `INSERT ... ON CONFLICT DO NOTHING` idempotent inserts. Reused from both the dev salvage path and `guest-migrate.ts`.

`src/lib/db/client/data-migrate/guest-migrate.ts`: existence-checks the guest OPFS file WITHOUT creating it (else `getLocalDb(0)` would recreate an empty guest DB after a prior migration consumed it). Copy with `rewrite: { user_id: targetUserId }`, delete guest file, `resetLocalDbCache()`.

## Sync pipeline

Server: `src/server/ai/sync/` split into `bundles.ts` (read), `state.ts` (state bulk), `sweep.ts` (TTL purge), `upsert.ts` (8 per-kind handlers + insert builders + referenced-entity inserts), `expiry.ts` (set/clear expiry, handler dispatch), `kinds.ts` (single-source-per-kind switch registry; add a new kind here), `payload-validate.ts` (Value.Cast + drift-log helper). Handles 8 kinds (`SYNC_KINDS` in `src/lib/validation/sync.ts`: `characters/personas/lorebooks/presets/cards/conversations/playgroundSessions/theme`; `theme` is single-row per userId, the other 7 are `RP_SYNC_KINDS` row-by-row). Route (`src/server/ai/sync/route.ts`) `.derive` runs `sweepExpired(userId, sweepKey())` once per request (WeakSet-memoized). 5 endpoints: `GET /state`, `GET /:kind/:id/bundle`, `POST /bundles` (batch bundle read, chunk 16), `POST /:kind/:id` (set expiry + persist bundle), `DELETE /:kind/:id` (clear expiry). `setSyncExpiry` accepts `{ days?, payload?, keepExpiry?, mergeMode? }`; `keepExpiry: true` is the mirror-PATCH-on-save path that preserves the existing expiry. Default TTL `DEFAULT_TTL_DAYS=30`. Per-kind `Value.Cast()` against per-bundle TypeBox schemas (`cardBundleBody`, `conversationBundleBody`, `playgroundSessionBundleBody`, `themeBundleBody` in `src/lib/validation/sync.ts`) coerces + fills defaults. RP-entity bodies use `characterBody`/`personaBody`/`lorebookBody`/`samplingPresetBody` from `src/lib/validation/rp.ts`. Conversation upserts are SELF-CONTAINED: a push carries the full bodies of every referenced character/persona/lorebook/preset, and the handler inserts those first inside the conversation's transaction so the conversation\_\* foreign keys resolve even if the entity was never synced on its own.

Client hydrator (`src/lib/db/client/sync/sync-state-hydrator.ts`): React component mounted in chat + playground layouts. Per-userId fire-once. Stage 1 (always): serial reads from local SQLocal seed the React Query cache (raw arrays for RP, page-shaped for convs `useInfiniteQuery`, `{items}` for playground sessions). Stage 2 (logged-in only): `GET /sync/state` returns `{ kind: [{id, updatedAt, syncExpiresAt}] }`; compare per-row `updatedAt`, pull `GET /sync/:kind/:id/bundle` for newer, `applyBundle` upserts locally. Stage 3: `drainPending(userId)`. Serial throughout (sqlocal transactionMutex). `rehydrateMedia` enforces the asymmetric base64 rule.

Pending queue (`src/lib/db/client/sync/pending-sync.ts`): `enqueuePending(userId, kind, id, op, err?)` upserts a `local_pending_sync` row by `(kind, id)`. `drainPending(userId, payloadFor?)` replays up to `MAX_PENDING_ATTEMPTS=5`; on success deletes the row, on failure bumps attempts + records `last_error`. Payload is rebuilt from current local state via `buildSyncPayload(userId, kind, id)` in `build-payload.ts` (theme is special-cased).

Client sync infrastructure (`src/lib/db/client/sync/`): `sync-state-hydrator.ts`, `pending-sync.ts`, `build-payload.ts` (cascade payload per kind), `evict-media.ts` (drops base64 after successful R2 upload by server), `resource-lock.ts` (cross-tab single-holder lock, `LOCK_TTL_MS` expiry covers crashed holder), `scheduler.ts` (periodic drain on focus/online; cross-tab mutex).

Mirror helpers (`src/hooks/ai/rp/shared.ts`):

- `mirrorSyncedRow(userId, kind, id, payload)`: PATCH via `rpc.api.ai.sync({kind})({id}).post({payload, keepExpiry: true})`; queues on failure.
- `deleteSyncedRow(userId, kind, id)`: DELETE; queues on failure.
- `mirrorConvIfSynced(userId, convId)`: rebuilds the conversation bundle and pushes if `syncExpiresAt != null`. Called post-mutation by every chat-touching hook.
- `mirrorConvPatchIfSynced(userId, convId, patch)`: shallow conv-row patch (rename/title), skips bundle rebuild.
- `mirrorSessionIfSynced(userId, sessionId)`: playground analog of `mirrorConvIfSynced`.

## Playground vertical

`src/server/ai/playground/` (8 files). Wraps `{success, data}` like chat (not pass-through).

- `route.ts`: `/submit`, `/poll`, `/references`, `/masks`, `/loras`, `/embeddings`, `/upscalers`. Guest gated to free non-comfyui models via `assertGuestAllowedModel`.
- `playground.service.ts`: `resolveSubmissionEndpoint` branches on `COMFYUI_TEMPLATE_IDS` (hardcoded) vs `chooseEndpoint(endpointTypes)` (precedence: `image-generation > openai > gemini`).
- `playground-submit-sync.ts`: sync-image flow. Fetches reference images (`MAX_REF_BYTES=10MB`, defined in `src/lib/ai/playground/dispatch.ts`), builds body via `src/lib/ai/playground/dispatch.ts` (three shapes: OAI `/v1/images/generations` multipart for refs, chat completions multimodal, Gemini `generateContent`), calls upstream, downloads result bytes to base64 via `downloadGenerationBytes` (NOT uploaded to R2 here; client owns persistence). Native batching only on `image-generation` endpoint; OAI chat + Gemini loop client-side.
- `playground-submit-comfyui.ts`: async task flow. Returns `{ taskId, status }` only; client polls `/poll` and persists on terminal. Maps form params (`steps/cfg/seed/denoise/hires/loras/refs/embeddings/controlNet/layerDiffusion/adetailer/upscaler` with native-scale lookup from `upscaler_catalog`) to the ComfyUI relay extras.
- `playground-sweeper.ts`: singleton background job started by `instrumentation.ts` register() (nodejs runtime only). 60s interval, batches of 100, concurrency 4. Reads `playground_sessions WHERE expiresAt < now`, deletes R2 objects per `media.r2Key`, cascade-deletes session row.
- `playground-catalogs.ts`, `playground-finalize.ts`, `playground-constants.ts`: catalog reads, n-from-body, COMFYUI template IDs.

Client hook `src/hooks/ai/playground-hook.ts`: `runSubmit` shared by submit + import-regenerate. Submit posts to `/submit`, gets either `{kind:"sync", images}` (persists locally + bumps session counters) or `{kind:"task", taskId}` (creates pending snapshot, client polls `/poll` every 2s until terminal). `useSnapshotStatusQuery` uses `refetchInterval` that returns false on terminal. `imageToMediaRow` maps each upstream image (base64 inline) into a local `media` row with `dataBase64` set; the asymmetric R2 upload happens on the next sync push.

## Other server domains

- `auth/web-bot-auth/`: verified inbound HTTP-Message-Signatures auth. `webBotAuthPlugin.derive` runs on every request: if `signature/signature-input/signature-agent` headers are present, fetches `${agentOrigin}/.well-known/http-message-signatures-directory` (5s timeout, 10min in-memory cache per origin), tries each Ed25519 JWK via `web-bot-auth/crypto`. Populates `verifiedAgent: { signatureAgent, origin, keyid }` on the request context. Public helpers in the same folder (`keys.ts` for JWKS parsing, `verify-inbound.ts` for the call). There is NO `src/lib/web-bot-auth/` folder.
- `billing/checkout-sessions/`: ACP (Agentic Checkout Protocol) implementation. `checkout-sessions.service.ts` holds the session logic (`createSession`/`getSession`/`updateSession`/`cancelSession`/`completeSession`); `errors.ts` + `idempotency.ts` round it out. Requires `API-Version: 2026-01-16` header. `Idempotency-Key` mandatory on all POSTs; `idempotency.ts` implements a `in_flight | done` state machine with body-hash conflict detection (422), `Retry-After: 1` on in-flight (409), 24h retention sweep on read. Item IDs follow `topup_<usd>_<method>` or `plan_<id>_<method>`. `completeSession` calls upstream pay endpoint, snapshots quota; later GETs `maybeAdvanceCompleted` heuristic flips to `completed` when quota delta covers the session amount.
- `billing/core/`: Stripe/Creem pay endpoints carry MPP `x-payment-info` annotations (`intent: "session"`, amount null, paymentauth.org draft).
- `ops/badge/`: dynamic SVG/PNG badge rendering with Satori + `@kitajs/html`. 8 templates (banner/square/sponsor/providers/pricing/hero/referral/brand) + `/all` HTML preview. `sharp` for PNG output. 5min stats + pricing cache. 1h Cloudflare cache + stale-while-revalidate.
- `ops/health/`: parallel checks db (`SELECT 1`), upstream (`/api/status`, 5s timeout), R2 (`HeadBucketCommand`).
- `models/model-status/`: pass-through for upstream model availability/status checks. Hook: `src/hooks/models/model-status-hook.ts`. Store: `src/store/status-store.ts`. Status subdomain (`status.*`) rewrites to `/<locale>/status` via `next.config.ts`.
- `ai/playground`, `ai/sync`: covered above.

## Route groups (app directory)

Locale-prefixed groups under `src/app/[locale]/`:

- `(auth)`: login, register
- `(chat)`: main chat UI (`chat/`, with nested `cards/`, `presets/`, `[convId]/`). Layout mounts `ChatRuntimeProvider`, `SyncStateHydrator`, `GuestLocalDbMigrate`, plus SSR prefetch of auth/pricing/conversations/best-key/RP entity lists/sync state.
- `(playground)`: playground UI (`playground/`, `playground/[id]`). Layout mounts `SyncStateHydrator` + `GuestLocalDbMigrate` + prefetches sync state.
- `(sidebar)`: dashboard, billing, settings, token, affiliate, logs
- `(navbar)`: marketing surface. Contains `(home)`, `pricing`, `models` (`[slug]`), `blog`, `rankings`, and nested `(legal)` (privacy, terms).
- `(docs)`: docs surface under `(docs)/docs/`. Every setup guide renders from ONE dynamic route `docs/[slug]/page.tsx` driven by the `SETUP_GUIDES` data array (`src/components/pages/docs/setup-guides.ts`). `generateStaticParams` enumerates `LOCALES x SETUP_GUIDES`; the page looks up the guide by slug (`getSetupGuide`, `notFound()` on miss) and renders `setup-guide-template.tsx` (hero, compat chips, steps, gotchas; recommended models come from `getFreeTextModels()` at runtime, never hardcoded). Add a normal guide by adding one object to `SETUP_GUIDES` (no new route, no new file). Escape hatch: a guide with `customComponent` renders a bespoke body via the `BespokeBody` switch in `[slug]/page.tsx` instead of the template; the only case today is `cc-switch` (the `ccswitch://` deep-link installer in `cli/cc-switch/cc-switch-content.tsx` + `cc-switch-deep-links.tsx`). `DOCS_REGISTRY` (`src/i18n/registry.ts`) derives its entries from `SETUP_GUIDES`, so search/sitemap/llms.txt/seo-timestamps pick up new guides with no edit. Leftover from the old per-page split: `(cli)/claude-code/page.tsx` + `cli/claude-code/claude-code-content.tsx` (plus the shared `cli/cc-switch/cc-switch-setup.tsx` it imports) is the one guide not yet migrated into `SETUP_GUIDES`; it still serves its static `/docs/claude-code` route. The old `(rp)` route group and the other per-tool `(cli)` pages are gone. `fumadocs-core/toc` is the TOC helper only (not the doc framework).
- `(status)`: model status page (`status/`), backed by the `models/model-status` route
- `consent/`: cookie/consent flow (plain segment, not a route group)

Non-locale segments under `src/app/`:

- `(discovery)`: SEO + agent-discovery surface. 16 route handlers: static SEO (`humans.txt`, `llms.txt`, `openapi.json`, `robots.txt`) plus `.well-known/` (`agent-card.json` per A2A spec, `acp.json`, `mcp.json`, `mcp/server-card.json`, `agent-skills/index.json`, `api-catalog`, `oauth-authorization-server`, `oauth-protected-resource`, `openid-configuration`, `ucp`, `http-message-signatures-directory`, `security.txt`).
- `api/[[...route]]`: Elysia BFF entrypoint
- `sqlocal/`: SQLocal/OPFS worker assets + the `/sqlocal/studio-css` route handler that serves the `@libsqlstudio/gui` stylesheet (with `:root` -> `:host` and `.dark` -> `:host(.dark)` rewrites for the Local DB Studio's Shadow DOM).

## Agent + Browser extensions

`src/components/provider/app/webmcp-provider.tsx` registers WebMCP tools on `navigator.modelContext` from `src/lib/config/webmcp-tools.ts` descriptors (`open_models_catalog`, `open_pricing`, `open_docs`, etc). Each tool returns `{path, target?, resultKey?}`; the provider handles navigation. Discoverable via `/.well-known/mcp.json` and `/.well-known/mcp/server-card.json`.

`src/components/elements/db/local-db-studio.tsx`: user-facing OPFS inspector embedding `@libsqlstudio/gui` in a Shadow DOM (so its CSS doesn't bleed). Actions: wipe (destroys SyncAccessHandle FIRST so `removeEntry` isn't no-op'd by the lock, then iterates root and removes everything), download SQLite blob, upload + overwrite. Forces full reload after destructive actions.

## Free-model race pattern

Title generation (`title.service.ts`) and web-search classification (`tavily.service.ts:needsWebSearch`) both race `FREE_MODEL_RACE_COUNT=5` free text models via `Promise.any(getFreeTextModels(5).map(generateText))`. Free models are flaky individually but a 5-way race resolves fast and fails closed.

## R2 security

`src/lib/config/r2.ts`. SSRF protection: blocked IPv4/IPv6 CIDR allowlist (loopback, link-local, RFC1918, CGNAT, carrier-grade NAT, broadcast). Hostname blocklist (`localhost`, `metadata.google.internal`, `metadata.goog`, `.internal` suffix). Port allowlist `[80, 443]`. Protocol allowlist `http/https`. Custom `undici` Agent with a `filteringLookup` DNS resolver that rejects non-public addresses at connect time. `redirect: "manual"` to close redirect-bypass. Download cap `MAX_DOWNLOAD_BYTES=50MB` (streamed with running total), per-user cap `MAX_USER_BYTES=100MB` via SQL sum. Magic-byte verification via `file-type`; allowlist `image/*, video/*, audio/*, application/pdf`; declared content-type must match detected (category-level for media, exact for documents).

Two key namespaces: chat media at `chat/<scope>/<convId>/<msgId>/<file>` (scope = `guest` for `userId=0` else `user`), playground at `playgrounds/<id>/<file>`, playground refs at `playgrounds-refs/<userId>/<file>` (separate so a snapshot delete doesn't sweep references).

## Background work

- `playground-sweeper`: started by `instrumentation.ts` register() in nodejs runtime. 60s interval. Purges Turso playground rows past `expiresAt` and their R2 objects.
- Sync `sweepExpired`: per-request WeakSet-memoized via `.derive` on `/sync/*`. Deletes synced rows past `syncExpiresAt` across all 8 kinds.
- ACP idempotency keys: lazy 24h sweep on every `withIdempotency` call.
- Server-side caches: pricing 5min (`pricing-cache.ts`), badge stats + pricing 5min (`badge/lib/cache.ts`), web-bot-auth directory 10min (`verify-inbound.ts`).

## Analytics

`src/lib/analytics.ts` is the canonical telemetry surface. Single `analytics` const groups events by feature (`auth/chat/billing/tokens/settings/navigation/affiliate/dashboard/logs/docs/rp/easterEgg/content`). Every event takes typed args and calls `posthog.capture(name, props)`. Components import as `analytics.<feature>.<event>(...)`. Add new events here; never call `posthog.capture` directly from a component.

Client posthog-js is NEVER statically imported (63KiB gzip would land in every page bundle). All client callers import the queue-buffered shim `src/lib/posthog-lazy.ts`; `instrumentation-client.ts` dynamically imports + inits posthog-js (prod, `NEXT_PUBLIC_POSTHOG_DISABLED` unset) and registers the instance, which flushes queued calls.

Server-side events go through `captureServerEvent` in `src/lib/posthog-server.ts` (prod-only, stitches distinctId from `ph_phc_*_posthog` cookie, falls back to `user-id`). Used by `stream.service.ts` for chat lifecycle (`chat_stream_started/completed/failed`, `chat_web_search_executed`).

`NEXT_PUBLIC_POSTHOG_DISABLED=true` (build-time, baked by Next) turns PostHog off entirely: `POSTHOG_DISABLED` in `src/lib/config/constants.ts` gates client init (`instrumentation-client.ts`), the provider (`posthog-provider.tsx`), server captures (`captureServerEvent`), and error reporting (`instrumentation.ts` `onRequestError`).

## Imperative confirm

`src/components/ui/confirm.tsx` exports `confirm(options): Promise<boolean>` (replaces `window.confirm`). Backed by a single pending-request atom written through `chatStore`, so it's callable from any handler (event, mutation, hook) without context or prop drilling. A second `confirm()` resolves the pending one as `false` first. `ConfirmProvider` is mounted once near the providers root.

## Private routes / robots / sitemap

`src/i18n/routing.ts` exports `privateRoutes = { static, dynamicParents }` as the single source of truth for `robots.txt` Disallow rules and `sitemap.xml` exclusions. Add a new authenticated route here, not in two places.

`src/app/sitemap.ts` enumerates every locale x pathname, looks up timestamps from `getSeoTimestamps`, and inlines pricing-derived model slugs. `src/app/(discovery)/robots.txt/route.ts` emits Disallow lines per locale per `privateRoutes` entry.

## React Query client

`src/lib/react-query/client.ts` `getQueryClient()`: server uses `cache(makeQueryClient)` (per-request), browser uses a module-scoped singleton. Defaults: `refetchOnWindowFocus: false`, `staleTime: Infinity` (caches never auto-invalidate; mutations call `invalidateQueries` explicitly).

Cross-tab invalidation (`src/lib/react-query/cross-tab-invalidate.ts`): `broadcastInvalidate(keys)` posts query keys over a BroadcastChannel so a mutation in one tab refreshes the others; `subscribeInvalidate(qc)` (mounted once via `useEffect` in `query-provider.tsx`) receives them and calls `invalidateQueries`. Used by `chat-hook.ts`, `playground-hook.ts`, the `makeRpEntity` factory, and `pending-sync.ts` after local writes.

## Cross-store API key bridge

`useApiKey` (`src/hooks/ui/use-api-key.ts`) reads `bestKey` via the billing token hook and mirrors the result into `apiKeyAtom` (cookie-backed `client-store`). The `client-store` cookie is what the server's `getApiKey(cookie)` reads. Net effect: a logged-in user's preferred token flows from server -> React Query -> Jotai cookie atom -> back to server on subsequent requests. The OS detection on mount writes into the same atom for code-snippet docs.

## Reset script + R2 prefixes

`drizzle/reset-db.ts` wipes Turso (every Drizzle migration replayed against a fresh DB) AND `deleteR2Prefix` on `chat/`, `playgrounds/`, `playgrounds-refs/` to prevent orphaned uploads. When adding a new R2 prefix anywhere in the codebase, add it to the script's `r2Prefixes` array.
