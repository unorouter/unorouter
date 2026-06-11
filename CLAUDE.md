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

Scripts in `scripts/`: `generate-search-index.ts` (Orama index from registry), `generate-seo-timestamps.ts` (`git log` per registry contentFiles into `public/seo-timestamps.json`), `bundle-migrations.ts` (writes `src/lib/db/client/schema-migrate/migrations.json`), `generate-openapi-refs.ts` (writes `.next/.openapi-types/references.json`), `generate-web-bot-auth-key.ts` (mints `WEB_BOT_AUTH_PUBLIC_JWKS` + `WEB_BOT_AUTH_PRIVATE_JWK` env values), `indexnow.ts` (IndexNow URL submission), `lighthouse.ts`.

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

`src/server/constants.ts` holds `getUserId/getApiKey/getProvider/deriveUpstream/ADMIN_HEADERS` (`getProvider(apiKey, BodyMutations)` wraps fetch with per-model body rewrites: Anthropic `cache_control`, deepseek prefix/thinking, claude adaptive thinking). Chat/title/playground key resolution is `resolveChatApiKey` in `src/server/billing/token/best-key.service.ts` (client-store cookie -> best-key upstream lookup via the user's own access_token -> `serverEnv.guestApiKey` -> throw). `src/server/env.ts` reads + validates required env vars; fails fast at module load when `SYSTEM_ACCESS_TOKEN` or `SESSION_SECRET` is missing or `SESSION_SECRET` is too short (< 32 chars).

- BFF entrypoint (`src/app/api/[[...route]]/route.ts`, Elysia): mount order = openapi plugin, then `webBotAuthPlugin` (populates `verifiedAgent`), then 5 domain routes. No requestId/timing/error middleware at root; `x-request-id` is forwarded by `deriveUpstream` when the caller supplies it. Openapi root carries MPP `x-service-info` annotations.
- Upstream client: `src/openapi.ts` (Orval-generated, ~17k LOC, never edit). Mutator `src/lib/custom-fetch.ts`.
- Two DBs, both Drizzle ORM / SQLite dialect:
  - Server: Turso/libSQL. `src/lib/db/server/client.ts` `getDb()`. Lazy. First call runs `migrate()` + `runSeeds()` fire-and-forget (skipped when `serverEnv.standalone`). First request can race a cold-start migration.
  - Client: SQLocal over OPFS, lazy WASM import (~1.5MB). `src/lib/db/client/client.ts` `getLocalDb(userId)` = per-userId promise cache + LocalClient wiring; per-user OPFS file `${appName}-${userId}.sqlite3`; SyncAccessHandle released on `pagehide`/`beforeunload`. Lifecycle in `connection.ts`: `openMigratedSql` (open + migrate; failed migration salvages rows to a fresh DB, copy-failure wipes; prod too) and `LocalDbConnection.run` (every statement path; on GetSyncHandleError/NotFoundError/SQLITE_CORRUPT/IOERR, e.g. site data cleared mid-session, it single-flight reopens and replays the statement, no reload needed).
  - Shared schema: `src/lib/db/schema/` (`shared.ts` = both, `server.ts` = server-only, `client.ts` = client-only, `rows.ts` = canonical `$inferSelect` row types, `index.ts` = server build entrypoint).
- Client state: Jotai (cookie-persistence via `atomWithStorage` + `jotaiCookieStorage`). Plus an in-memory `chatStore = createStore()` exposed for non-React callers.
- Server state: React Query 5. Hooks read the local SQLocal DB, then mirror to Turso when `syncExpiresAt != null`. Invalidation is cheap since queries hit local DB.
- Type pipeline: TypeBox schema, Elysia validation, Eden Treaty RPC, `handleElysia()`, React Query hook.
- i18n: next-intl. 18 locales in `public/i18n/`: `ar/de/en/es/fr/he/hi/id/it/ja/ko/pl/pt-BR/ru/tr/vi/zh-CN/zh-TW`. `src/proxy.ts` runs next-intl middleware + stamps COEP/COOP/CORP on infra prefixes. `src/i18n/routing.ts` carries per-locale translated `pathnames` for every static + dynamic route (e.g. `/models` becomes `/modelle/moderu/модели/...`). Messages PRECOMPILE at build (`experimental.messages` in `next.config.ts`); `t.raw` unsupported repo-wide. Client payload pruned via `src/i18n/client-messages.ts` (strips TERMS/PRIVACY/WELL_KNOWN/BLOG.POSTS; DOCS = allowlist + per-guide TITLE/SUBTITLE); `ClientIntlProvider` THROWS on MISSING_MESSAGE in dev so stripped-key use fails loudly. One-off client islands get translated strings as props from server parents. Interim until next-intl tree-shaking (amannn/next-intl#1).
- Media: Cloudflare R2 via AWS SDK + SSRF-safe undici fetch (CIDR allowlist, DNS filtering, magic-byte verification, 50MB download cap, 100MB per-user quota, port allowlist). `src/lib/config/r2.ts`.
- Search: Orama, index pregenerated at build via `scripts/generate-search-index.ts` from `DOCS_REGISTRY/BLOG_REGISTRY` in `src/i18n/registry.ts`.
- SEO: `src/lib/seo/` (`metadata.ts` includes inline timestamp loader, `structured-data.ts`, `json-ld.tsx`). Build-time timestamps via `scripts/generate-seo-timestamps.ts` running `git log` per registry `contentFiles`.
- Observability: Pino logger (`src/lib/utils/logger.ts`, always include `context` field). PostHog server via `src/instrumentation.ts` `onRequestError` (prod only, extracts distinctId from `ph_phc_*_posthog` cookie). PostHog client via `src/instrumentation-client.ts`.
- Auth: upstream-driven OAuth + email/password. App sets `access_token` (httpOnly) and signed `user-id` cookies after callback. Turnstile on login/register.
- COEP isolation: chat + playground layouts get COEP `require-corp` / COOP `same-origin`. `proxy.ts` runtime-stamps headers (dev/turbopack bypasses `next.config.ts` `headers()`): `ISOLATED_PATHS` (`/_next/`, `/api/`, `/sqlocal/`) get CORP `same-origin` + COEP `require-corp` + COOP `same-origin`; `PUBLIC_CROSS_ORIGIN` (`/api/ops/badge`) gets CORP `cross-origin` so third-party sites can embed badges.
- PWA / offline: Serwist via `@serwist/turbopack` (the webpack `@serwist/next` no-ops under Next 16's Turbopack build). The SW is SERVED BY AN APP ROUTE, not a `public/sw.js` file: `src/app/sw-worker/[path]/route.ts` calls `createSerwistRoute({ swSrc: "src/app/sw.ts" })` and serves the bundled worker + chunks at `/sw-worker/sw.js`. The route is `force-dynamic` + `revalidate: 0` (the factory's default `force-static` makes Next emit `s-maxage=1yr`, which once poisoned the Cloudflare edge cache un-purgeably; hence force-dynamic + a `no-cache` header on `/sw-worker/*` in both `next.config.ts` and `proxy.ts`, and the path moved off the poisoned `/serwist/`). `next.config.ts` wraps with `withSerwist` (marks esbuild as a server-external package). SW source is `src/app/sw.ts` (worker exports from `@serwist/turbopack/worker`); `navigationPreload` is OFF so navigations route through the SW fetch and the offline fallback fires deterministically. A raw `fetch` listener in `sw.ts` calls `stopImmediatePropagation` for (a) ALL cross-origin requests (defaultCache's regex/catch-all rules would otherwise NetworkFirst third-party fetches like the Cloudflare insights beacon, throwing loud no-response errors when adblocked/offline and caching opaque responses) and (b) worker/sharedworker/wasm/sqlocal requests so SQLocal's OPFS async-proxy worker (SharedArrayBuffer + Atomics.wait) is never intercepted (else OPFS persistence times out). Registered manually by `src/components/provider/app/sw-register.tsx` at `/sw-worker/sw.js` scope `/` (route sets `Service-Worker-Allowed: /`), mounted in `[locale]/layout.tsx`, prod-only. `proxy.ts` has an early `/sw-worker/` bypass (skips next-intl locale rewrite, adds CORP + no-cache). SW caching is COEP-safe: every runtime matcher is gated on `sameOrigin` (those `_next/static` + `/api` responses already carry CORP `same-origin`); `/api/*` + `/sqlocal/*` are `NetworkOnly`; navigations are `NetworkFirst` with NO networkTimeoutSeconds (a timeout served the PREVIOUS build's HTML on slow links, 404ing its chunks after deploys and killing all event handlers) and `/en/offline` (`src/app/[locale]/offline/page.tsx`, static, no auth/SQLocal; registered in `routing.ts` pathnames + privateRoutes) as the document fallback. The serwist glob only covers `_next` static output + `public/`, NOT rendered app-route HTML, so `/en/offline` is precached explicitly via `additionalPrecacheEntries` in the sw-worker route (revision = `.next/BUILD_ID`); without it the fallback never matches and offline navigations reject with no-response. Manifest (`[locale]/manifest.webmanifest`) + icons + `metadata.ts` wiring predate this. Build-scoped runtime caches (`pages`, `pages-rsc`, `pages-rsc-prefetch`, `others`) are wiped in the SW `activate` handler so a new deploy can never mix cached HTML/RSC from an old build with new chunks. Works offline for guests + logged-in (local-first reads need no network).

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
- Never refactor files directly under `src/components/ui/` for conciseness (no splitting, no compression passes). This rule covers ONLY that exact path (its shadcn/assistant-ui derived primitives), not other `ui/` folders elsewhere in the tree. Those primitives stay as-is; only touch them for real bug fixes or requested features.
- No `sql.transaction()` wrappers in client SQLocal code. The transactionMutex deadlocks every later DB call if any statement throws. Use bare exec loops + `ON CONFLICT DO NOTHING` (see `replaceChildRows`, `runMigrations`, `copyAllTables`).

## Key patterns

Elysia routes (`src/server/<domain>/<feature>/route.ts`): validate with TypeBox (`body:` / `query:` / `params:`), derive upstream headers with `.derive(deriveUpstream)`, call either the Orval client (pass-throughs) or a local `*.service.ts` (chat/playground/sync/billing checkout). No try/catch in route handlers.

Hooks (`src/hooks/`): feature-grouped into `ai/`, `auth/`, `billing/`, `models/`, `ops/`, `ui/`. Mutations call Eden Treaty, unwrap with `handleElysia()`, use `handleError(e, t)` in `onError` for i18n toasts.

`makeRpEntity` (`src/hooks/ai/rp/factory.ts`): generic `<TItem, TCreateBody, TUpdateBody>` that emits `{useList, useItem, useCreate, useUpdate, useDelete}`. Each mutation writes local first, mirrors via `mirrorSyncedRow`/`unmirrorIfSynced` when `syncExpiresAt != null` (outbox enqueue + debounced drain), invalidates list/item keys. The single source of CRUD for characters/personas/lorebooks/presets/cards.

`makeTableStore` (`src/lib/db/client/data/table-store.ts`): Drizzle wrapper emitting `{list, get, upsert, drop}` for any SQLocal table. `scopeUser` toggle ANDs `eq(table.userId, uid)` into WHERE and merges userId into upsert rows; tables without a `userId` column (`messages`, `lorebookEntries`, etc.) pass `scopeUser: false`.

`replaceChildRows` (`src/lib/db/client/data/table-store.ts:28`): FK-scoped delete + insert loop. NO transaction wrapper. `mergeChildRows` (same file, line 57) is the upsert sibling: per-row PK `ON CONFLICT` so existing siblings survive (used on sync-pull of child arrays).

Jotai atoms: `atomWithStorage` plus `jotaiCookieStorage` for cookie persistence. Derived atoms via `atom(getter, setter)`. The chat store (`src/store/chat-store.ts`) exposes a shared store instance `chatStore`; non-React callers (stream callbacks, `confirm()`, the `thread.tsx` runtime bridge) read/write atoms synchronously via `chatStore.get(atom)` / `chatStore.set(atom, value)`. `chatStoreAtom` is hydrated server-side from its cookie via `ChatStoreProvider` (`src/components/provider/state/chat-store-provider.tsx`, same pattern as models/navigation/client stores), so saved model/loadout are correct on first paint; selector atoms fall back to INITIAL state per field (cookie-schema-drift defense).

Server pages: prefetch with `getQueryClient()` plus `HydrationBoundary` and `dehydrate()`. Cookies pre-read on the server via `getCookieValue<T>` + `use()` and passed into store providers.

Auth cookies (`src/lib/config/constants.ts` for names; `src/store/client-store.ts` for `CLIENT_STORE_KEY`):

- `access_token`: httpOnly, upstream API token, 30 day TTL
- `user-id`: signed via iron-session (`signUserId`/`verifyUserId` in `src/lib/utils/server.ts`), readable by server handlers, used by `getUserId(cookie)` in `src/server/constants.ts`. Requires `SESSION_SECRET` (>= 32 chars).
- `client-store`: JSON (`CLIENT_STORE_KEY`, owned by `src/store/client-store.ts`), holds the user's own API key (for direct `getApiKey(cookie)` use). Server imports the key constant from the store module.
- Guest users fall back to `serverEnv.guestApiKey` via `resolveChatApiKey(cookie)` (`best-key.service.ts`), which also closes the logged-in-but-cookie-not-yet-hydrated race by resolving the user's best key upstream.

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

- `route.ts`: `GET /:id/meta`, `GET /:id/markdown`, `POST /title`, `POST /stream` (answers 409 `{code:"context-required"}` on a context-cache miss; guest streams force `webSearch=false`), `POST /trigger-op/llm|similarity|imggen` (client-mode V1 lowLevelAccess effects; auth required), `GET /task/:taskId`, `POST /:id/task/finalize`. API keys resolve via `resolveChatApiKey` (`billing/token/best-key.service.ts`: client-store cookie -> best-key upstream lookup -> guest key). No POST/PATCH/DELETE for conversation or messages: those live in client hooks (`src/hooks/ai/chat-hook.ts`) writing the local SQLocal DB.
- `conversation.service.ts`: `getConversation` + `getConversationMarkdown` (Turso reads; markdown walks the active branch).
- `model-flags.ts`: per-model flags (RisuAI LLMFlags port) keyed off the model NAME (DeepSeek/GLM/Kimi/Gemini/Claude/GPT families). Role flags OR with the preset's manual flags; a manual flag is never silently turned off. Also request-mutation flags: `deepSeekPrefix`/`deepSeekThinkingToggle`/`deepSeekThinkingInput`, `claudeAdaptiveThinking`/`claudeXHighEffort`, `noCivilIntegrity` (gemini thinking-exp drops CIVIC_INTEGRITY from the safety list), `cacheControl` (single gate for the Anthropic cache injector). prepare.ts maps them to `bodyMutations`; `getProvider(apiKey, bodyMutations)` in `src/server/constants.ts` applies them via a JSON-body-rewriting fetch wrapper. o-series system->developer + max_completion_tokens renames are upstream new-api's job, never re-mapped here.
- `stream.service.ts` + `stream/`: `stream.service.ts` is orchestration only (media dispatch, telemetry, the `streamText` call, response shaping); the entire text-request assembly stage lives in `stream/prepare.ts` (`prepareChatRequest`: context resolve, web search, regex scripts, start triggers, memory, prompt assembly, history budgeting, template walk, per-model role transforms, writeback diffs, request-log snapshot). Helpers split into `stream/transforms.ts` (PDF inline, depth splicing, macro expansion, role transforms, reasoning/think-tag strip, token budgeting, gemini safety) and `stream/media-stream.ts` (`handleImageStream`/`handleVideoTaskStream`/`handleAudioStream` TTS+STT/`handleEmbeddingStream`/`generateEmbedding`/`handleBufferedStream`). Dispatch switches on `isMediaModel(body.model)` mediaType: text (default), image (inline data URLs, client persists base64), video task (`data-task` part client polls + finalizes), audio, embedding. `maxRetries: 2` retries RETRYABLE errors only (429/5xx/network, exponential backoff); deterministic 4xx surface verbatim. Free models capped at `FREE_MODEL_OUTPUT_CAP=8192`; unknown model caps fall back to `UNKNOWN_MODEL_OUTPUT_CAP=4096`. Anthropic prompt caching: `getProvider({injectCacheControl})` wraps fetch to mark system + last user message `cache_control: ephemeral`, Claude models only (`src/server/constants.ts`). PDF parts pointing at R2 get inlined as text from `media.extractedText`; missing extraction inserts a placeholder (no throw). Token usage + cost + writebacks (vars/globalVars/summary) + speaker tag + the request-log debug snapshot ride ONE `buildFinishMeta` builder: the streamed path emits it on the `finish` part via `messageMetadata`, the buffered path (streaming-off + media follow-ups) synthesizes the same object as a `message-metadata` chunk. The assistant message id is SERVER-generated, which lets the server persist the request-log row directly to Turso for SYNCED conversations at stream finish (`persistRequestLogIfSynced`); clients never push `requestLogs` up the sync wire. `request_logs.msg_id` has NO FK to `messages` (the log row lands before the client pushes the message row); `conv_id` cascade covers cleanup.
- `stream/context-cache.ts`: per-conversation upload-dedup handshake. Client fingerprints its RP context (FNV-1a, `fnv1aHex` in `utils/base.ts`) and sends `chatContextHash` only on repeat turns; the server LRU+TTL cache resolves hash -> last full payload, a miss throws `ContextRequiredError` -> 409 and the client's fetch wrapper retries once with the full context. `globalVars` ride OUTSIDE the hash (change every setglobalvar turn). Context source order: client `chatContext`/hash -> Turso `loadConvContext` fallback (guests/legacy).
- Message-shape pipeline lives in `src/lib/ai/chat/messages.ts` (`partsToItems`/`itemsToParts`). Maps ai-sdk `tool-invocation` (state-based: call vs result) to typed DB rows `tool_call`/`tool_result`. `data-task` part bidirectional with `task` DB type. `file` and `source-url` map to `file`/`image`. `error` items (failed run persisted as a branch node, partial text kept) render as `data-error` parts, stripped upstream by `stripReasoningParts`; offline failures persist no node (queued semantics).

Augmentation (`src/server/ai/chat/augmentation/`): pipeline pieces the stream service composes.

- `prompt-assembler.service.ts` + `prompt-assembler/`: `assembleForStream` + `assembleFromOverrides` + `AssembledSystem`. Split: `prompt-assembler/conv-context.ts` (`loadConvContext`, `buildContextFromClient`), `prompt-assembler/lorebook.ts` (`keyHits`, `selectLorebookEntries`, `parseDecorators`). Default order: `main_prompt -> system_fallback -> top entries -> before_char entries -> per-character blocks -> persona -> after_char entries -> systemPromptOverride||primary.systemPrompt -> example-message few-shot turns -> [chat history] -> postHistoryInstructions + preset.postHistory + bottom entries`. `at_depth` entries return as `DepthInjection[]` spliced by `spliceDepthInjections`. Multi-character: primary drives `{{char}}` (the speaking character floats to primary per turn); non-primary chars with `alwaysActive=false` are gated via `turnTriggers` + `matchWholeWords`. `extraBody` from settings beats preset on key clash; sliders + reasoning then win over both in providerOptions.
- Lorebook selection: SINGLE GLOBAL POOL (RisuAI fullLore): one priority ranking under one shared token budget (max of book budgets, gpt-tokenizer estimate), one recursion namespace (`MAX_RECURSIVE_LOREBOOK_PASSES=3` when any book has `recursiveScanning`); per-book `scanDepth` applies to matching only; scans user AND assistant history. RisuAI/CCardLib `@@decorator` lines parsed from entry content: `@@probability` (seeded per turn), `@@scan_depth`, placement/depth/role overrides, `@@activate_only_after/every`, sticky `@@keep/dont_activate_after_match` (state persisted in conversation vars), `@@inject_*` lore-into-lore, recursion flags. Placement sorts book binding order -> entry orderIndex -> priority.
- `prompt-template.ts`: RisuAI prompt template, user-orderable card array (`slot` | `plain` | `chat` history marker with ranges) stored as preset `promptTemplate` JSON; `DEFAULT_PROMPT_TEMPLATE` reproduces the fixed order so the no-template path is byte-identical. The stream walk hoists the leading system run into the `system` param (skipped under noSystemRole so char data isn't silently dropped).
- CBS macro engine lives in `src/lib/ai/chat/macros.ts` (isomorphic; moved out of augmentation/ so the client can expand greetings). Full RisuAI port: field tokens, seeded roll/random/pick stable across regenerates, calc RPN, string/array/dict ops, conversation/global/temp vars, history readers, per-message time/date macros (client sends `messageTimes` + `clientEnv` viewport/locale/timeZone on the stream body, OUTSIDE the hashed context), block forms `{{#if}}`/`{{#if_pure}}`/`{{#when}}` (line-based else, dead branch still expands like Risu)/`{{#each}}` (slot substitution, `§` arrays)/`{{#pure}}`/`{{#puredisplay}}`/`{{#escape}}` (private-use char mapping, un-mapped by `unescapeMessages`/`risuUnescape` at request build), `{{// comment}}`, `{{? calc}}`, `{{return}}` abort. Any `{{/...}}` closes the innermost block (Risu stack semantics). App-coupled macros resolve to safe empties. Var writes mutate the scope in place and ride back via finish-meta writebacks (`vars`, `globalVars`).
- `memory.service.ts` + `semantic-retrieval.service.ts`: opt-in per-conversation memory (`memoryEnabled`). Rolling summary (RisuAI supaMemory analog): oldest unsummarized chunk folds into a running summary via free-model race, injected as a `[Story so far]` system block; summarized messages are CUT from the prompt (`dropSummarizedPrefix`); client persists `summaryMemory`/`summaryAnchor` from the writeback. Semantic retrieval embeds recent chat + lorebook candidates via `/v1/embeddings`, cosine-ranks top-K into a `[Relevant background]` block. Both best-effort.
- `run-triggers.ts` + `example-messages.ts`: server-side `start`-mode trigger execution (async; system-prompt injection, var mutations, stop flag honored by stream.service as an empty UI stream, showAlert collected + streamed as transient `data-alert` parts the runtime toasts via `onData`, runImgGen inlay bytes ride finish-meta `inlayMedia` for client persistence) and exampleMessages parsing into role-tagged few-shot turns. `inlay.service.ts` generates one image via the first image-capable catalog model; `{{inlay::<mediaId>}}` tokens render from the local media table via `src/lib/db/client/data/inlay-render.ts` (cache + version atom) in markdown preprocess.
- `moderation.service.ts`: Creem prompt-moderation gate (`MODERATION_TIMEOUT_MS=5s`, env-gated via `CREEM_MODERATION_ENABLED`). Persists every `allow|flag|deny|error` decision to the server-only `moderation_log` table. `assertPromptAllowed` runs before image/video generation only.
- `task.service.ts`: async video task submit/poll. `finalizeVideoTask` rewrites the persisted `task` message_item to a `text` item with an R2-hosted `![video](url)` markdown line.
- `title.service.ts`: stateless title gen via `freeModelRace` (`maxOutputTokens: 30`); strips think-tags (unclosed `<think>` would become the visible title), truncates to ~60 chars on race failure. The client persists.
- `tavily.service.ts`: web search. Free-model race classifier (`needsWebSearch`, 3-token output, fail-closed) gates a Tavily API call (5s abort, max 5 results). Guests forced `webSearch=false` (paid-only).

Isomorphic chat engines in `src/lib/ai/chat/` (no server-only imports; shared by stream service + client runtime): `regex-scripts.ts` (RisuAI customscript: server runs `editprocess`/`editinput` pre-assembly, client runs `editoutput` on persist + `editdisplay` at render; `<order N>`/`@@action` meta, parse memo keyed by array identity), `triggers/` (`vm.ts` indent-scoped V2 effect VM (async) + `opcodes.ts` data opcodes + `types.ts`; display/request modes sandboxed to a safe opcode subset; V1 lowLevelAccess effects `runLLM/checkSimilarity/extractRegex/runImgGen/showAlert/sendAIprompt/triggerlua` run through a caller-provided `ctx.ops` bridge: server modes call services directly (`augmentation/trigger-ops.ts`), client modes POST `/chat/trigger-op/llm|similarity|imggen` (`runtime/trigger-ops-client.ts`) + `triggerAlert` dialogs (`src/components/ui/trigger-alert.tsx`, mounted next to ConfirmProvider); `triggers/lua/` is the wasmoon Lua runtime (engine-per-mode, json.lua from `public/lua/`, Risu luaCodeWrapper + ~50-binding API in `lua/api.ts`, `runLuaEditTrigger` editinput/editoutput/editrequest hooks; wasmoon is lazy-imported, `serverExternalPackages` + a turbopack `module` alias to `src/lib/empty-module.ts` keep its node branch out of browser bundles)), `calc.ts` (RPN evaluator + `seededRand`), `group-order.ts` (multi-character turn ordering: name-mention priority then seeded weighted-random talkness, no back-to-back), `free-model-race.ts`, `messages.ts`.

Stream-order rules (LOCKED, see the ORDER LOCKED comment in `stream/prepare.ts`): 1) `stripReasoningParts` FIRST (reasoning echoed as input is rejected; also strips inline think-tags from assistant history). 2) `stripSystemRole` (noSystemRole) BEFORE merge so system-as-user can collapse. 3) `dropEmptyMessages` BEFORE merge (dropping after can recreate consecutive same-role messages strict upstreams reject). 4) `appendPrefill` BEFORE merge so a doubled trailing assistant folds. 5) `mergeAlternateRoles` AFTER prefill. 6) `prependUserStub` after merge so merge cannot fold it. 7) `appendUserStub` LAST (GLM "last role must be user"), skipped when a prefill is the intentional trailing assistant.

Per-provider tweaks: role transforms apply automatically per model via `getModelRoleFlags` (OR'd with preset manual flags). `geminiBlockOff` sets all five Gemini safety categories to threshold `OFF`. `stripSystemRole` rewrites system role to user with a `system: ` prefix. All transforms in `stream/transforms.ts` are pure.

RP entities (characters, personas, lorebooks, presets, cards) are 100% local-first: zero server route surface. CRUD goes through `makeRpEntity` against SQLocal + mirrors via `/sync/:kind/:id`. Export is local too via `src/lib/db/client/data/rp-export.ts` (calls isomorphic helpers in `src/lib/ai/rp/`). Import/serialization helpers: `src/lib/ai/rp/` (`character-card.ts` SillyTavern card v2/v3 via `@character-foundry/character-foundry`, `persona-import.ts`, `lorebook-import.ts`).

Conversation export/import is local-first, not a server route. The logic lives in `src/lib/db/client/data/transfer/`: `native.ts` (`buildNativeExport`, `toOrpg`, `persistMappedImport`), `sillytavern.ts` (`exportLocalConversationSillyTavern`, `importSillyTavernChat`), `map.ts` (format mappers + ID remap on import). Reads/writes the client SQLocal DB directly. Formats: `unorouter.1.0` native, `orpg.3.0` (OpenRouter-compatible with `_unorouter_extension` for lossless extras), SillyTavern JSONL. Works for guests since it never touches Turso.

Playground session export/import lives in `src/lib/db/client/data/playground-transfer.ts` (`exportLocalSession`/`importLocalSession`). Envelopes: `unorouter-session-1` wrapping per-snapshot `unorouter-generation-1`. Image bytes inlined as base64 (fetched from R2 if not cached locally) so the file survives R2 expiry and works for guests.

## Chat runtime architecture (browser)

Under `src/components/pages/sidebar/chat/runtime/` (`ChatRuntimeProvider` mounted in `(chat)` layout). Bridges `@assistant-ui/react` to local-first storage:

- `chat-runtime-provider.tsx` (composition only): `AssistantRuntimeProvider` + `useRemoteThreadListRuntime` + inner `useAISDKRuntime(useChat, { adapters: {attachments, history} })`; owns the per-conv cross-tab stream lock (released in onFinish/onError), the wrapped `sendMessage` (lock acquire, `ensureConvId`, multi-character rotation loop with `speakingCharacterIdAtom` tagging), and `useChatHelpersBridge` (publishes `setMessages/getMessages/sendEmpty` via `chatHelpersAtom` so `thread.tsx` drives `useChat` from outside the tree). Composed domains, one file each:
  - `chat-transport.ts`: `DefaultChatTransport`; `body()` reads live atoms via `chatStore.get`, DYNAMICALLY imports `buildChatContextFromLocalDb` (~110KB lorebook/trigger machinery off first paint). Context-dedup handshake: full `chatContext` only when its FNV-1a fingerprint changed for the conv, else hash only; the `fetch` wrapper retries ONCE with the full payload on 409 `context-required`. `prepareSendMessagesRequest` trims the uploaded history window when memory is off (rolling-summary convs send full).
  - `auto-continue.ts`: conv opt-in `autoContinue`; reply not ending in terminal punctuation chains argless continuation sends, max 3 (RisuAI parity).
  - `group-rotation.ts`: `computeSpeakingOrder` via `groupOrder` (active bindings, name-mention scan, last-speaker filter).
  - `use-thread-sync.ts`: `useConvIdSync` (remoteId -> `convIdAtom`), `useModelSync` (conv model seeds `chatModelAtom`; atom changes write `upsertLocalConversationSettings` + `mirrorConvRowIfSynced`), `useScrollToBottom`.
- `chat-history-adapter.ts`: `ThreadHistoryAdapter`. `load()` serves from React Query cache if present, else from local SQLocal. `append()` persists the message row + items via `partsToItems`, derives usage from `message.metadata.usage` (written by the stream service `messageMetadata` callback), bumps conversation totals, invalidates queries, and calls `mirrorConvMessagesIfSynced(userId, id, [messageId], true)` (msg delta + conv-row writeback).
- `thread-list-adapter.ts`: pure local-first `RemoteThreadListAdapter`. `initialize` seeds the new conv row from `chatDefaultsAtom` + binds the sticky `chatLoadoutAtom` loadout (preset/persona/characters/lorebooks auto-equipped on every new chat), then seeds the primary character's greeting: `firstMessage` + `characters.alternateGreetings` insert as root branch SIBLINGS (CBS-expanded once), the preview-picked one active; `conversations.firstMsgIndex` = activeBranch - 1 (Risu fmIndex; -1 = firstMessage), updated by `useSetActiveBranchMutation` on root-assistant swipes and driving the `@@is_greeting` lorebook gate. `GreetingPreview` (`pages/sidebar/chat/greeting-preview.tsx`, in ThreadWelcome) lets the user pick before first send via `greetingIndexAtom`. The history adapter's `append` anchors a null-parent first send to the DB active tip so the user turn chains under the greeting. `rename`/`delete` use `mirrorConvRowIfSynced` / `unmirrorIfSynced` (outbox rows). `generateTitle` calls `POST /chat/title`, persists locally, mirrors patch if synced.
- `chat-utils.ts`: `createLocalAttachmentAdapter` writes file bytes as base64 into the local `media` table and returns `data:` URL parts. Conv id is pre-generated via `ensureConvId()` so the media row has a stable cascade parent.

Send-failure semantics (Risu parity): NO auto-replay. Retries are bounded and live in the request layer only: `stream.service.ts` `streamText({ maxRetries: 2 })` retries RETRYABLE errors (429/5xx/network, exponential backoff); deterministic 4xx surface verbatim. On failure the user turn stays persisted (history adapter writes it on the failed-run transition) and the user resends manually; offline failures show `CHAT.QUEUED_OFFLINE` instead of a network error. Detection only, no replay: `findUnansweredUserTurns(userId)` in `src/lib/db/client/data/queued-send.ts` returns conversations whose active-branch leaf is a `role='user'` message with no active child + no later active sibling; `useQueuedSends` (query key `queuedSends`, invalidated by the history adapter `append`) feeds the sidebar "Queued" badge.

## Local-first DB layer

`src/lib/db/schema/shared.ts`: 18 tables mirrored client + server. Per-conversation settings (model, sampling, vars, memory, web search, autoContinue, groupOrderByOrder, firstMsgIndex, ...) live as COLUMNS ON the `conversations` row (the old `conversation_settings` table is folded in; `CONVERSATION_SETTINGS_KEYS` in `src/lib/db/conversation-settings.ts` is the key list both sync sides spread). Every syncable table carries `syncExpiresAt` (null = local-only; non-null = synced, Turso row is server-purged past the timestamp). Drizzle `.$type<>()` narrows text columns to validation-derived literal unions (`MessageRole`, `MessageItemType`, `ReasoningEffort`, `WebSearchEngine`, `WebSearchContextSize`, `LorebookEntryPosition`, `LorebookInjectionRole`, `UserTheme`, `GenerationStatus`, `PlaygroundVisibility`).

`src/lib/db/schema/server.ts`: server-only tables — `moderation_log`, `acp_checkout_sessions`, `acp_idempotency_keys` (`AcpIdempotencyState` narrowing), 3 catalogs (`lora/embedding/upscaler`).

`src/lib/db/schema/client.ts`: client-only — `local_pending_tasks` (PK `(task_type, kind, id)`; multi-variant outbox: `task_type` selects the drain handler (`sync` | `logEnrich`), per-task args ride a generic `payload` JSON column, `seq` guards mid-drain enqueues; `MAX_PENDING_ATTEMPTS=5` from `src/lib/db/client/sync/pending/types.ts`, `SyncKindName` + `PendingSyncOp` + `PendingTaskType` narrowing. `kind` stores `""` for non-sync tasks, the queue maps `"" <-> null` at its DB boundary) and `local_meta` KV (holds `migration_version` cursor). `LOCAL_ONLY_TABLES` excludes both from cross-DB copy/salvage.

`media` table has an ASYMMETRIC SYNC RULE: client writes `dataBase64` (and `r2Key`/`r2Url` stay null); the server's `sync.service` upload handler reads base64, uploads to R2, stamps `r2Key/r2Url`, and stores `dataBase64=null`. The hydrator's `rehydrateMedia` probes local first, fetches R2 only on first sight, and NEVER overwrites a present local cache (transient R2 failure preserves bytes).

`src/lib/db/client/schema-migrate/migrations.ts`: reads the bundled `migrations.json` manifest, enables `PRAGMA foreign_keys = ON`, then runs forward-only from `local_meta.migration_version`. Splits each migration on `--> statement-breakpoint`. NO `sql.transaction()` wrapper (transactionMutex deadlock if any statement throws).

`src/lib/db/client/data-migrate/copy.ts` `copyAllTables(source, target, opts)`: `PRAGMA foreign_keys = OFF` during copy, ON in finally. Column intersect drops drift silently. Uses `INSERT ... ON CONFLICT DO NOTHING` idempotent inserts. Reused from both the dev salvage path and `guest-migrate.ts`.

`src/lib/db/client/data-migrate/guest-migrate.ts`: existence-checks the guest OPFS file WITHOUT creating it (else `getLocalDb(0)` would recreate an empty guest DB after a prior migration consumed it). Copy with `rewrite: { user_id: targetUserId }`, delete guest file, `resetLocalDbCache()`.

## Sync pipeline

Server: `src/server/ai/sync/` split into `bundles.ts` (read), `state.ts` (state bulk), `sweep.ts` (TTL purge), `upsert.ts` (8 per-kind handlers + insert builders + referenced-entity inserts), `expiry.ts` (set/clear expiry, handler dispatch), `kinds.ts` (single-source-per-kind switch registry; add a new kind here), `payload-validate.ts` (Value.Cast + drift-log helper). Handles 8 kinds (`SYNC_KINDS` in `src/lib/validation/sync-constants.ts`: `characters/personas/lorebooks/presets/cards/conversations/playgroundSessions/theme`; `theme` is single-row per userId, the other 7 are `RP_SYNC_KINDS` row-by-row). Route (`src/server/ai/sync/route.ts`) `.derive` runs `sweepExpired(userId, sweepKey())` once per request (WeakSet-memoized). 5 endpoints: `GET /state`, `GET /:kind/:id/bundle`, `POST /bundles` (batch bundle read, chunk 16), `POST /:kind/:id` (set expiry + persist bundle), `DELETE /:kind/:id` (clear expiry). `setSyncExpiry` accepts `{ days?, payload?, keepExpiry?, mergeMode? }`; `keepExpiry: true` is the mirror-PATCH-on-save path that preserves the existing expiry. Default TTL `DEFAULT_TTL_DAYS=30`. Per-kind `Value.Cast()` against per-bundle TypeBox schemas (`cardBundleBody`, `conversationBundleBody`, `playgroundSessionBundleBody`, `themeBundleBody` in `src/lib/validation/sync.ts`) coerces + fills defaults. RP-entity bodies use `characterBody`/`personaBody`/`lorebookBody`/`samplingPresetBody` from `src/lib/validation/rp.ts`. Conversation upserts are SELF-CONTAINED: a push carries the full bodies of every referenced character/persona/lorebook/preset, and the handler inserts those first inside the conversation's transaction so the conversation\_\* foreign keys resolve even if the entity was never synced on its own.

Client hydrator (`src/lib/db/client/sync/sync-state-hydrator.ts` = component + stage orchestration + toasts; stages split into `local-seed.ts` (stage 1 cache seeding), `reconcile.ts` (stage 2 state pull + bundle chunk fetch with per-row fallback), `apply-bundle.ts` (per-kind local upserts), `rehydrate-media.ts` (asymmetric base64 R2 fetch)): React component mounted in chat + playground layouts. Per-userId fire-once. Stage 0 (logged-in only): `migrateGuestLocalDb(userId)` folds guest rows into the user DB (idempotent single-flight in `data-migrate/guest-migrate.ts`; the hydrator is the ONLY call site, so stage 1 always reads post-copy state and no query invalidation is needed). Stage 1 (always): serial reads from local SQLocal seed the React Query cache (raw arrays for RP, page-shaped for convs `useInfiniteQuery`, `{items}` for playground sessions). Stage 2 (logged-in only): `GET /sync/state` returns `{ kind: [{id, updatedAt, syncExpiresAt}] }`; compare per-row `updatedAt` (local-newer rows are SKIPPED + logged), pull newer bundles via the batched `POST /bundles` (per-row `GET .../bundle` fallback on deploy skew), `applyBundle` upserts locally. The reconcile runs in `requestIdleCallback`; conv-page loads skip the active conv's bundle pull (SSR already covered it). Stage 3: `drainPending(userId)`. Serial throughout (sqlocal transactionMutex). `rehydrateMedia` enforces the asymmetric base64 rule.

Outbox (`src/lib/db/client/sync/pending/`): the deferred-work queue, split into a generic engine + per-task handlers (NEVER a barrel; import the leaf module). `pending/queue.ts` owns the engine: `enqueueTask({userId, taskType, kind, id, op, payload, hint?, msgIds?})` (read-merge-write through the task's `coalesce`, serialized via a module promise chain), `drainPending` (FIFO + backoff, dispatches `getHandler(row.taskType).drain`, deletes the row only if `seq` is unchanged so a mid-drain enqueue survives, calls `onExhausted`/`onRetry` hooks), `drainLocked`/`safeDrain`/`drainSoon` (250ms-debounced post-enqueue drain, cross-tab lock). `pending/types.ts` holds `MAX_PENDING_ATTEMPTS=5`, backoff schedule, `TaskHandler`/`OutboxRow`/`DrainResult`. `pending/registry.ts` maps `taskType -> TaskHandler`. `pending/sync-task.ts` is the `sync` handler (the ONLY push path): `enqueueSync(userId, kind, id, op, {hint, msgIds})` unions conversation scope hints (`full`/`row`/`bindings`/`msgs`; `full` absorbs the rest) + msgIds and serializes them into the row's `payload` JSON; `drain` rebuilds wire payload(s) via `buildPendingPushes`, POSTs `keepExpiry: true`, evicts media base64 after full pushes; `onRetry` escalates a partial conv push to `full` (self-healing); `onExhausted` dead-letters into the badge. It also owns the badge/DLQ API (`readPendingSync`/`clearPending`/`retryPendingTargets`) and `readOutboxMsgIds` (reconcile keeps not-yet-pushed messages). `pending/log-enrich-task.ts` is the `logEnrich` handler (`enqueueLogEnrich`, pulls new-api's authoritative cost/tokens/channel after a stream settles, retries on not-yet-logged). No payload snapshots for sync: coalescing N rapid edits into one row stays correct because drain reads current local state.

Client sync infrastructure (`src/lib/db/client/sync/`): `sync-state-hydrator.ts`, `pending/` (the outbox queue + handlers, above), `build-payload.ts` (cascade payload per kind), `evict-media.ts` (drops base64 after successful R2 upload by server), `resource-lock.ts` (cross-tab single-holder lock via `navigator.locks`; browser auto-releases when the holding tab dies). Periodic retry drain on focus/online lives in `src/hooks/ai/use-pending-drain-scheduler.ts` (mounted by the hydrator); happy path is `drainSoon` after each enqueue.

Mirror helpers (`src/lib/db/client/sync/mirror.ts`) are outbox enqueuers: each gates on sync state, writes a `local_pending_tasks` row via `enqueueSync(userId, kind, id, op, {hint, msgIds})`, and kicks `drainSoon(userId)` (250ms debounce). They carry SCOPE, never payloads; the drainer rebuilds wire data from the local DB.

- `mirrorSyncedRow(userId, kind, id)` / `unmirrorIfSynced(userId, kind, id, wasSynced)`: any sync kind (RP entities, playground, theme); full-row rebuild at drain.
- `mirrorConvIfSynced(userId, convId)`: hint `full` (history rewrites: delete message, clear, overrides save).
- `mirrorConvRowIfSynced(userId, convId)`: hint `row` (rename, drawer settings, model switch; conversation-row columns only).
- `mirrorConvBindingsIfSynced(userId, convId)`: hint `bindings` (join tables, replace mode).
- `mirrorConvMessagesIfSynced(userId, convId, msgIds, withRow?)`: hint `msgs` (+`row`); message-delta upsert.
- `mirrorSessionIfSynced(userId, sessionId)`: playground analog of `mirrorConvIfSynced`.

Initial sync ENROLLMENT (`sync-hook.ts` add/resync) stays a direct RPC (it sets `days` + needs the response for media eviction); steady-state pushes all go through the outbox.

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
- `ops/badge/`: dynamic SVG/PNG badge rendering with Satori + `@kitajs/html`. 9 templates (tokens-banner/tokens-square/sponsor/providers/pricing/hero/referral/brand/social) + `/all` HTML preview. `social` renders Reddit/Discord banner variants with raw-SVG glow backgrounds (`svgBackground` injected behind the Satori tree). `sharp` for PNG output. 5min stats + pricing cache. 1h Cloudflare cache + stale-while-revalidate.
- `ops/health/`: parallel checks db (`SELECT 1`), upstream (`/api/status`, 5s timeout), R2 (`HeadBucketCommand`).
- `models/model-status/`: pass-through for upstream model availability/status checks. Hook: `src/hooks/models/model-status-hook.ts`. Store: `src/store/status-store.ts`. Status subdomain (`status.*`) rewrites to `/<locale>/status` via `next.config.ts`.
- `ai/playground`, `ai/sync`: covered above.

## Route groups (app directory)

Locale-prefixed groups under `src/app/[locale]/`:

- `(auth)`: login, register
- `(chat)`: main chat UI (`chat/`, with nested `cards/`, `presets/`, `[convId]/`). Layout mounts `ChatRuntimeProvider` + `SyncStateHydrator`, plus SSR prefetch of auth/pricing/conversations/best-key/RP entity lists/sync state.
- `(playground)`: playground UI (`playground/`, `playground/[id]`). Layout mounts `SyncStateHydrator` + prefetches sync state.
- `(sidebar)`: dashboard, billing, settings, token, affiliate, logs
- `(navbar)`: marketing surface. Contains `(home)`, `pricing`, `models` (`[slug]`), `blog`, `rankings`, and nested `(legal)` (privacy, terms).
- `(docs)`: docs surface under `(docs)/docs/`. Every setup guide renders from ONE dynamic route `docs/[slug]/page.tsx` driven by the `SETUP_GUIDES` data array (`src/components/pages/docs/setup-guides.ts`). `generateStaticParams` enumerates `LOCALES x SETUP_GUIDES`; the page looks up the guide by slug (`getSetupGuide`, `notFound()` on miss) and renders `setup-guide-template.tsx` (hero, compat chips, steps, gotchas; recommended models come from `getFreeTextModels()` at runtime, never hardcoded). Add a normal guide by adding one object to `SETUP_GUIDES` (no new route, no new file). Escape hatch: a guide with `customComponent` (`"cc-switch" | "claude-code"`) renders a bespoke body via the `BespokeBody` switch in `[slug]/page.tsx` instead of the template (bodies in `cli/cc-switch/` + `cli/claude-code/`). `DOCS_REGISTRY` (`src/i18n/registry.ts`) derives its entries from `SETUP_GUIDES`, so search/sitemap/llms.txt/seo-timestamps pick up new guides with no edit. Nav megamenu (`nav/navigation.ts`), docs sidebar (`docs-navigation.ts`), and the docs index all derive from `SETUP_GUIDES` too. No static per-guide routes remain. `fumadocs-core/toc` is the TOC helper only (not the doc framework).
- `(status)`: model status page (`status/`), backed by the `models/model-status` route
- `consent/`: OAuth consent flow (plain segment, requires session; not a route group)
- `offline/`: static SW offline fallback page (no auth/SQLocal)

Non-locale segments under `src/app/`:

- `(discovery)`: SEO + agent-discovery surface. 16 route handlers: static SEO (`humans.txt`, `llms.txt`, `openapi.json`, `robots.txt`) plus `.well-known/` (`agent-card.json` per A2A spec, `acp.json`, `mcp.json`, `mcp/server-card.json`, `agent-skills/index.json`, `api-catalog`, `oauth-authorization-server`, `oauth-protected-resource`, `openid-configuration`, `ucp`, `http-message-signatures-directory`, `security.txt`).
- `api/[[...route]]`: Elysia BFF entrypoint
- `sqlocal/`: SQLocal/OPFS worker assets + the `/sqlocal/studio-css` route handler that serves the `@libsqlstudio/gui` stylesheet (with `:root` -> `:host` and `.dark` -> `:host(.dark)` rewrites for the Local DB Studio's Shadow DOM).

## Agent + Browser extensions

`src/components/provider/app/webmcp-provider.tsx` registers WebMCP tools on `navigator.modelContext` from `src/lib/config/webmcp-tools.ts` descriptors (`open_models_catalog`, `open_pricing`, `open_docs`, etc). Each tool returns `{path, target?, resultKey?}`; the provider handles navigation. Discoverable via `/.well-known/mcp.json` and `/.well-known/mcp/server-card.json`.

`src/components/elements/db/local-db-studio.tsx`: user-facing OPFS inspector embedding `@libsqlstudio/gui` in a Shadow DOM (so its CSS doesn't bleed). Actions: wipe (destroys SyncAccessHandle FIRST so `removeEntry` isn't no-op'd by the lock, then iterates root and removes everything), download SQLite blob, upload + overwrite. Forces full reload after destructive actions.

## Free-model race pattern

Centralized in `src/lib/ai/chat/free-model-race.ts` (`freeModelRace`): races `FREE_MODEL_RACE_COUNT=5` free text models via `Promise.any(getFreeTextModels(5).map(generateText))`. Consumers: title generation (`title.service.ts`), web-search classification (`tavily.service.ts:needsWebSearch`), rolling-summary folding (`memory.service.ts`). Free models are flaky individually but a 5-way race resolves fast and fails closed.

## R2 security

`src/lib/config/r2.ts`. SSRF protection: blocked IPv4/IPv6 CIDR allowlist (loopback, link-local, RFC1918, CGNAT, carrier-grade NAT, broadcast). Hostname blocklist (`localhost`, `metadata.google.internal`, `metadata.goog`, `.internal` suffix). Port allowlist `[80, 443]`. Protocol allowlist `http/https`. Custom `undici` Agent with a `filteringLookup` DNS resolver that rejects non-public addresses at connect time. `redirect: "manual"` to close redirect-bypass. Download cap `MAX_DOWNLOAD_BYTES=50MB` (streamed with running total), per-user cap `MAX_USER_BYTES=100MB` via SQL sum. Magic-byte verification via `file-type`; allowlist `image/*, video/*, audio/*, application/pdf`; declared content-type must match detected (category-level for media, exact for documents).

Two key namespaces: chat media at `chat/<scope>/<convId>/<msgId>/<file>` (scope = `guest` for `userId=0` else `user`), playground at `playgrounds/<id>/<file>`, playground refs at `playgrounds-refs/<userId>/<file>` (separate so a snapshot delete doesn't sweep references).

## Background work

- `playground-sweeper`: started by `instrumentation.ts` register() in nodejs runtime. 60s interval. Purges Turso playground rows past `expiresAt` and their R2 objects.
- Sync `sweepExpired`: per-request WeakSet-memoized via `.derive` on `/sync/*`. Deletes synced rows past `syncExpiresAt` across all 8 kinds.
- ACP idempotency keys: lazy 24h sweep on every `withIdempotency` call.
- Server-side caches: pricing 5min (`pricing-cache.ts`, internal consumers), badge 5min, web-bot-auth dir 10min. PUBLIC upstream GETs use the Next Data Cache 1h via `PUBLIC_CACHE` (`src/lib/config/constants.ts`, spread into Orval call options): pricing, subscriptions, rankings, perf-metrics, plus the GUEST branch of topup-info/subscription-plans. RULE: pair `PUBLIC_CACHE` with `ADMIN_HEADERS` (cache keys by URL only; customFetch auto-attaches user cookies without explicit auth, which would leak one user's response to all). Logged-in branches stay uncached. Items >2MB silently never store (stats/history caches its computed summary in-module instead).

## Analytics

`src/lib/analytics.ts` is the canonical telemetry surface. Single `analytics` const groups events by feature (`auth/chat/billing/tokens/settings/navigation/affiliate/dashboard/logs/docs/rp/content`). Every event takes typed args and calls `posthog.capture(name, props)`. Components import as `analytics.<feature>.<event>(...)`. Add new events here; never call `posthog.capture` directly from a component.

Client posthog-js is NEVER statically imported (63KiB gzip would land in every page bundle). All client callers import the queue-buffered shim `src/lib/posthog-lazy.ts`; `instrumentation-client.ts` dynamically imports + inits posthog-js (prod, `NEXT_PUBLIC_POSTHOG_DISABLED` unset) and registers the instance, which flushes queued calls.

Server-side events go through `captureServerEvent` in `src/lib/posthog-server.ts` (prod-only, stitches distinctId from `ph_phc_*_posthog` cookie, falls back to `user-id`). Used by `stream.service.ts` for chat lifecycle (`chat_stream_started/completed/failed`, `chat_web_search_executed`).

`NEXT_PUBLIC_POSTHOG_DISABLED=true` (build-time, baked by Next) turns PostHog off entirely: `POSTHOG_DISABLED` in `src/lib/config/constants.ts` gates client init (`instrumentation-client.ts`), the provider (`posthog-provider.tsx`), server captures (`captureServerEvent`), and error reporting (`instrumentation.ts` `onRequestError`).

## User theme

`src/components/ui/theme/`: shadcn-variable theme customizer. `theme-store.ts` (`UserTheme`, cookie-persisted via `theme-store-provider.tsx` `useHydrateAtoms`, first-mount only), `theme-build-css.ts` (`buildThemeCss` + `buildBackgroundCss`; background image is localStorage-only, painted on `body::before`), `theme-server.ts` (cookie pre-read). `[locale]/layout.tsx` renders the CSS in a React hoistable `<style href="user-theme" precedence>` so extension-injected style nodes (Dark Reader) can't be adopted in its place during hydration. Synced cross-device as the single-row `theme` sync kind (`userThemes` table).

## Imperative confirm

`src/components/ui/confirm.tsx` exports `confirm(options): Promise<boolean>` (replaces `window.confirm`). Backed by a single pending-request atom written through `chatStore`, so it's callable from any handler (event, mutation, hook) without context or prop drilling. A second `confirm()` resolves the pending one as `false` first. `ConfirmProvider` is mounted once near the providers root.

## Private routes / robots / sitemap

`src/i18n/routing.ts` exports `privateRoutes = { static, dynamicParents }` as the single source of truth for `robots.txt` Disallow rules and `sitemap.xml` exclusions. Add a new authenticated route here, not in two places.

`src/app/sitemap.ts` enumerates every locale x pathname, looks up timestamps from `getSeoTimestamps`, and inlines pricing-derived model slugs. `src/app/(discovery)/robots.txt/route.ts` emits Disallow lines per locale per `privateRoutes` entry.

## React Query client

`src/lib/react-query/client.ts` `getQueryClient()`: server uses `cache(makeQueryClient)` (per-request), browser uses a module-scoped singleton. Defaults: `refetchOnWindowFocus: false`, `staleTime: Infinity` (caches never auto-invalidate; mutations call `invalidateQueries` explicitly).

Cross-tab invalidation (`src/lib/react-query/cross-tab-invalidate.ts`): `broadcastInvalidate(keys)` posts query keys over a BroadcastChannel so a mutation in one tab refreshes the others; `subscribeInvalidate(qc)` (mounted once via `useEffect` in `query-provider.tsx`) receives them and calls `invalidateQueries`. Current caller: `pending/queue.ts` (sister tabs refresh sync state + badges on drain success).

## Cross-store API key bridge

`useApiKey` (`src/hooks/ui/use-api-key.ts`) reads `bestKey` via the billing token hook and mirrors the result into `apiKeyAtom` (cookie-backed `client-store`). The `client-store` cookie is what the server's `getApiKey(cookie)` reads. Net effect: a logged-in user's preferred token flows from server -> React Query -> Jotai cookie atom -> back to server on subsequent requests. The OS detection on mount writes into the same atom for code-snippet docs.

## Reset script + R2 prefixes

`drizzle/reset-db.ts` wipes Turso (every Drizzle migration replayed against a fresh DB) AND `deleteR2Prefix` on `chat/`, `playgrounds/`, `playgrounds-refs/` to prevent orphaned uploads. When adding a new R2 prefix anywhere in the codebase, add it to the script's `r2Prefixes` array.
