> **Scope:** this file is ONLY things that stop you breaking something: rules, invariants, load-bearing pairs, and traps whose cause is invisible at the call site. It is not a tour of the codebase. Do not add "file X does Y" entries; open file X. When a change makes a rule here wrong, fix the rule in the same commit.

Next.js 16 AI chat app. React 19 compiler, Tailwind v4, shadcn/ui. Elysia BFF in front of an upstream `new-api` service. Local-first: a per-user SQLocal/OPFS DB in the browser is the SOLE source of truth for chat/RP state. Cross-device transfer is local export/import only.

Chat/RP state has exactly one copy, the browser DB. Turso holds ONLY the model-tester rankings tables. "Sync" in this codebase means atom<->local-DB. Do not add a server-side mirror, a `/sync` route, a server context cache, or a retry that expects the server to hold context.

## Commands

```bash
bun dev:log          # dev server (logs to /tmp/next.log)
bun build            # prebuild: search index + bundled migrations. postbuild: openapi refs
bun lint             # eslint
bun typecheck        # tsc --noEmit
bun prettier         # format the repo
bun openapi          # regenerate openapi.ts from upstream spec (Orval)
bun db:generate      # drizzle-kit generate (server + client) then bundle migrations
```

NEVER start, restart, or kill the dev server. Read `/tmp/next.log` for errors.

Local SSR calls `api.unorouter.com` through the public edge without a session, which rule 5 (credential-less `/api/*`) challenges. `EDGE_DEV_TOKEN` in `.env` is sent as `x-edge-dev` and exempts the request; the value lives in `infra/infra/cloudflare/unorouter.com/rules*.sops.yaml`. Symptom when missing or stale: `Just a moment...` 403 in `/tmp/next.log`.

NEVER run `bun run build` or `rm -rf .next` in this repo while dev may be running. They share the single-writer turbopack cache in `.next/cache`; a concurrent build corrupts it ("Unable to write SST file") and deleting `.next` kills the live dev server (ENOENT manifests, MODULE_NOT_FOUND chunks, every route 500s). Verify builds in a detached worktree:

```bash
git worktree add /tmp/uno-build HEAD && cd /tmp/uno-build && bun install && bun run build
git worktree remove --force /tmp/uno-build
```

## Rules

- No prop destructuring in function signatures. Use `props.field`. Exceptions: spreading, defaults.
- No `useMemo` or `useCallback`. React 19 compiler handles memoization.
- No dashes as punctuation (em, en, `--`). ASCII only, except translation VALUES which must carry real diacritics and full-width CJK punctuation.
- Full translation keys, UPPER_SNAKE nested: `t("BILLING.CURRENT_BALANCE")`. `msg()` in non-React code. Real translations in every locale file, never English placeholders.
- Query keys from `src/lib/react-query/keys.ts` only. Never raw string arrays.
- Named exports for components. `"use client"` at the top of client components. Kebab-case files. Suffixes `*.service.ts`, `route.ts`, `*-hook.ts`, `*-store.ts`, `*-adapter.ts`.
- Never create barrel re-export files when splitting a module. Move the symbol, then rewrite every importer to the real path.
- Dates via the shared `dayjs` singleton (`src/lib/utils/format/date.ts`). Never raw `Date` or `toLocaleDateString`.
- Enum-like types are a TypeBox `t.Union([t.Literal(...)])` plus a derived type. No new TS `enum`; the block in `src/lib/types/enums.ts` is grandfathered, do not add to it. Drizzle text columns narrow via `.$type<>()` from those unions.
- **Never reach for `as` to make an error go away.** A cast does not convert anything at runtime: it only tells tsc to stop checking, so it trades a compile error you can see for a runtime bug you cannot. Writing one because "I know the type" defeats the point of having types at all, since the compiler no longer verifies the thing you claim to know, and it will not re-check it when the shape changes underneath you. Fix the source instead: annotate the declaration (`const x: T = {...}`, which checks every member, where a per-member cast checks nothing), widen a parameter (`readonly T[]` for an `as const` argument), narrow with a real runtime guard (`typeof`, `in`, `Array.isArray`, a TypeBox `Check`), or use `satisfies` when you want inference kept AND validated. **`as` at a CALL SITE is a bug in the CALLEE's signature**: the same cast in two files means the signature is wrong, so fix it once there and every cast disappears. A cast is only correct where TS genuinely cannot follow: a verified `unknown` after a runtime check, a DOM/vendor global TS does not model, or a documented library type bug. **`as unknown as X` is never acceptable** in app code (the single cast failed, so the two types are unrelated and the claim is false); use a validator that returns the real type. Verify by DELETING the cast and running `bun typecheck`: if it still passes, the cast was hiding nothing and must go. That sweep removed 162 dead casts from `lucide-static.ts` alone, where the record was already annotated.
- Never refactor files directly under `src/components/ui/` for conciseness. That exact path only (shadcn/assistant-ui primitives); touch them only for real bugs or requested features.
- **No `sql.transaction()` in client SQLocal code.** The transactionMutex deadlocks every later DB call if any statement throws. Use bare exec loops + `ON CONFLICT DO NOTHING` / `INSERT OR IGNORE`.
- After a mutation writes the local DB, `invalidateQueries`. No network round-trip, so no `setQueryData` patches or optimistic rollback.
- **ONE local database per device, and no client code selects it by user.** `getLocalDb()` takes no argument. The only client tables still carrying `userId` are the model-tester ones, whose id comes from `useAuthUserId()`/`authUserId()` (the auth query cache), never from a cookie mirror. Do not reintroduce a client-side user-id atom or a per-user OPFS path.
- **Pass upstream shapes through. Never remap them in the BFF.** Renaming `model_name` to `name`, or rebuilding `{id,name,icon}` from flat fields, is a casing translation layer that silently drops every field it forgets. `snake_case` from the gateway is fine. A BFF route whose body is `.map()` over upstream rows should be `async () => getSomething()`. Real REDUCTIONS and genuinely CHANGED values (unit, currency, computed flag) are the exceptions, and they belong upstream anyway since new-api is ours (`new-api/dto/pricing.go`). Corollary: `handleElysia` unwraps any `{success, data, ...}` body to `data` and DROPS the siblings, so a route over our own DTOs must not use that envelope. Name the field for what it holds (`models`, not `data`) and let the status carry success.
- **Fix it upstream in new-api whenever upstream CAN.** new-api is ours, so "the gateway does not return that" is a task, not a constraint: add the field, the query param, or the route. A BFF handler that filters, sorts, counts or reshapes an upstream payload is backend work in the wrong process, and it fetches the whole payload to emit a fraction (`/vendor` pulled 341 models to render 12 until `?vendor=` existed). Prefer a real purpose-built route over a fake wrapper around a bigger one, and prefer fixing the shape upstream over caching it in the BFF: a cache is what you add when you CANNOT fix the shape, and here you can. Derived MODEL FACTS (prices, counts, modality, is-it-free, sort order) go upstream; unorouter PAGE LAYOUT (which vendors the homepage features, capability knobs the image UI renders) stays. Target body for a route in `src/server/**/route.ts`: `async () => getSomething()`. The BFF keeps auth, cookies, composing SEVERAL upstream calls, and unorouter-only view state.

## Architecture

Dependency direction, one-way, no back-edges: `route.ts` (validate + delegate) -> `*.service.ts` (domain logic) -> db/data layer. Routes never hold domain logic; services never import routes.

The isomorphic chat engine (`src/lib/ai/chat/`) is PURE of server-secret and data-source access. Anything touching a token, Tavily, embeddings or pricing is injected through the `AssemblerDeps` seam (`pipeline/deps.ts`), which is what lets the same code run in the browser for both text paths and be reused server-side for title/media. `src/lib/ai/providers/` and `agents/` are leaf modules: types + primitives, never routes or React. Keep it that way.

Server routes are 5 domains under `src/server/`: `ai/`, `auth/`, `billing/`, `models/`, `ops/`. BFF entrypoint `src/app/api/[[...route]]/route.ts` mounts openapi, then the 5 domains. `src/openapi.ts` is Orval-generated, ~17k LOC, NEVER edit; regenerate with `bun openapi`.

`src/server/env.ts` fails fast at module load when `SYSTEM_ACCESS_TOKEN` or `SESSION_SECRET` is missing, or `SESSION_SECRET` is under 32 chars.

**Route return conventions**, pick by domain and never mix within a route: pass-throughs (`auth`, most `billing`, `models`, `ops/logs`) `return unwrap(res)`; local-logic routes (`ai/chat`, `ops/health`) `return { success: true, data }` so `handleElysia()` can distinguish success from typed failure.

**Validation lives in two TypeBox folders by route type:** `src/lib/validation/` for the `ai/chat` vertical, badge, media, settings and RP forms; `src/lib/api/typebox/` for BFF pass-throughs mirroring upstream.

Elysia routes validate with TypeBox, derive upstream headers with `.derive(deriveUpstream)`, then call the Orval client or a `*.service.ts`. No try/catch in handlers. Hooks call Eden Treaty, unwrap with `handleElysia()`, and use `handleError(e, t)` in `onError` for i18n toasts.

### Cross-origin and caching

NO cross-origin isolation anywhere. The browser DB uses opfs-sahpool, which needs no COOP/COEP. Do not reintroduce COEP: it forced full document reloads at route-group boundaries and broke third-party embeds. The badge route sets CORP `cross-origin` on its OWN responses so third parties can embed badges.

Caching is DATA-ONLY. `cacheComponents` is OFF and `use cache`/`cacheLife` are gone. Component caching cost a DOUBLE RENDER per request (Next prerenders, hits request data, discards, renders again), pure waste when nearly every route reads cookies. Do not reintroduce either to "speed things up"; it measurably did the opposite.

Two distinct mechanisms, do not conflate: (a) React `cache()` = per-REQUEST dedup, not a TTL (`getPricingSummary`, `getCatalog`); (b) module state + timestamp = a real TTL, and there are only two (benchmarks permaslug 30d, runware catalog 30min). Should a URL-keyed fetch cache ever return, it MUST pair with `ADMIN_HEADERS`: `customFetch` auto-attaches the triggering user's cookies, so a URL-only key serves one user's response to everyone.

### Rendering

Every route is dynamic. Nothing prerenders. The one surviving `generateStaticParams` is `sw-worker/[path]/route.ts`, which genuinely emits static assets.

ZERO `<Suspense>` in `src/`, deliberately: the boundaries that existed were prerender ceremony, painting a static shell around a request-bound hole on a page that is rendered per request anyway. Verified across home, models, rankings, status, settings, chat and image, with a CLS trace of 0.01 versus the 0.2 the old `icon.tsx` fallback existed to prevent. Consequence before adding one back: a suspending client hook (`useSearchParams`, `useQueryState`) or a `next/dynamic` chunk now suspends to the ROOT, so a slow chunk blanks the page. If that appears on a real connection, add ONE targeted boundary at the component, never restore layout-level gates.

The `(sidebar)` layout IS the auth gate: it awaits the cookie-bound self lookup and `redirectToLogin()`s on empty, so it must stay a plain async layout. A Suspense wrapper would commit a 200 before the redirect could fire.

Next 16 never fires `[locale]/not-found.tsx` for `notFound()` bubbling out of child segments. Every route group whose pages call `notFound()` needs its OWN `not-found.tsx`.

## Client DB (SQLocal / opfs-sahpool)

One pool, one file `${appName}.sqlite` (`singleDbPath()`). Pre-adoption `${appName}-${userId}.sqlite3` pools stay on disk as the rollback and are still readable by salvage. Four subsystems, each guarding a real data-loss mode. Read the code before changing any of them.

- **Orphaned-pool guard** (`assertNotSilentlyEmptied`): opfs-sahpool verifies a digest in each pool file's 4096-byte header on install and, on failure, SILENTLY drops the logical name and frees the slot, so the next open creates an empty DB under the same name and the app looks WIPED. A torn header is what an abrupt iOS Safari tab kill produces; one user lost a long RP this way. So an empty DB whose pool still holds a strictly larger sqlite file throws non-recoverable `OpfsSAHPool orphan`, deliberately excluded from `isRecoverable` (else the retry loop reopens the same empty replacement and reports success). The user gets DB-unavailable with bytes intact, recoverable via `sahpool/salvage.ts`.
- **Never blind-wipe** (`openMigratedSql`): recoverable open errors retry with capped backoff leaving files untouched; non-recoverable rethrow. The per-statement `run` wrapper reopens and replays once on a recoverable mid-session failure.
- **Multi-tab handover**: one tab owns a pool at a time (single-writer, so no torn headers), but ownership moves on demand via a BroadcastChannel `want` + waiting Web Lock. `want` MUST be re-sent on an interval, since a one-shot is lost when the owner has not finished its own open. The owner drains in-flight statements, pauses its VFS, then releases. A minimum hold stops per-statement ping-pong. A HIDDEN tab parks itself after 5s idle (and again after every re-acquire), because Android Chrome freezes background tabs regardless of Web Locks, and a frozen owner never answers `want`. Only a hung owner reaches DB-unavailable (`TAB_LOCK_MARKER`, non-recoverable as the backstop).
- **Legacy migration**: Safari has no main-thread `FileSystemFileHandle.move()`, so the rollback copy goes through `createWritable` before removing the original. If the copy itself fails the legacy file must STILL be removed: keeping it means the next open re-imports it wholesale and discards everything written since.

**Migrations** run forward-only with NO transaction wrapper, in three passes, each a fallback for the last, so a column the live code SELECTs always exists after open instead of dying as a runtime "no such column": forward replay; then `reconcileSchema` (12-step rebuild on DDL drift, but it ABORTS rather than drop ROWS: dropping columns is intended, dropping rows never is); then `validateColumns` (`ALTER ADD` for nullable, `forceRebuildWithDefaults` backfilling a synthesized default for a missing NOT NULL).

**`reconcileImport`** is not a byte-overwrite, which would adopt a foreign file's drift wholesale. Invariants that must survive any edit: live is written EXACTLY ONCE, after a complete replacement is built; a byte-identical backup stays on disk until the swap verifies; `LOCAL_ONLY_TABLES` are never copied from the dump. `overwriteDatabaseFile` must get an `ArrayBuffer` (structured-cloning a File/Blob across the worker boundary throws DataCloneError). A mid-swap crash is healed by `recoverPendingImport`, which runs in `openClient` BEFORE `openMigratedSql`.

**Schema layout**: `schema/shared.ts` = both DBs, `client.ts` = client-only, `rows.ts` = canonical row types. The model-tester tables are ONE definition serving both: client holds private history with a real `userId`, server holds the public board written with `userId = 0` so the unique `(userId, kind, host)` key acts as a global `(kind, host)`, gated on `verified_at IS NOT NULL`.

**Branch-scoped vars**: `messages.branch_vars` snapshots chat vars per branch. Assembly seeds from the ACTIVE TIP, falling back to `conversations.vars`. On persist a turn's snapshot is this turn's `varsWriteback` else the PARENT's. This is what isolates sibling swipes so a regenerate cannot read another swipe's setvar state. Known partial: output-mode triggers still write `conversations.vars` directly.

Media has no object storage: bytes live inline as base64 in the OPFS `media` table.

## State

Jotai atoms load their cookie AFTER mount (no `getOnInit`), so the first client render matches the server-rendered INITIAL state.

**`chatStoreAtom` is the exception and BOTH HALVES ARE LOAD-BEARING**: `getOnInit: true` PAIRED with `ChatStoreProvider` seeding it server-side. Neither may be removed alone. `getOnInit` without the provider reintroduces the React #418 mismatch on the chat model button (`8744a119` removed it for exactly that). The deferred load without `getOnInit` reopens the window where any write spreads `INITIAL_CHAT_STATE` over the cookie and silently drops every field it did not name (the provider-pin loss, the `maxTokens` revert of `1a080093`). Selector atoms fall back to INITIAL per field, defending against cookie-schema drift.

**`useSettingsSync` MUST NOT write `chatDefaultsAtom`.** That atom is the cookie-persisted STICKY new-chat defaults, written only by the drawer's defaults-mode save; mirroring a sparse conv row into it wiped the user's defaults for every later new chat (the all-samplers-off regression). The provider-group pin is deliberately NOT conversation-synced: it keys by active model, because the old `useGroupSync` lost a conv-load race and persisted a null pin.

jotai footgun: storing a FUNCTION via `chatStore.set(atom, fn)` runs it as an updater. Always `set(atom, () => fn)`.

nuqs owns URL filter state; never hand-roll `useSearchParams` + `router.replace` (static-shell bailout + an RSC round-trip per change). The `/models` page bridges nuqs to the jotai store at the STORE level, because atomWithStorage's cookie hydration lands after the first commit's subscribers register and its notify does not reliably reach them.

React Query defaults are `staleTime: Infinity` + `refetchOnWindowFocus: false`, so caches never auto-invalidate and mutations must invalidate explicitly.

Auth cookies: `access_token` (httpOnly, 30d, NO refresh flow: the fork pins both `AccessTokenTTL` and `LoginSessionTTL` to 30d, so a leaked token stays valid until then; re-adding revocation means a shorter TTL or a session-row check, NOT restoring `/auth/refresh`), `user-id` (httpOnly, iron-session signed, needs `SESSION_SECRET` >= 32; the ONLY user-id cookie, since the unsigned `local-user-id` twin is gone and logout exists to clear the stale ones), `client-store` (JSON, holds the user's own API key).

`user-id` is httpOnly and the client NEVER reads it: the seal is server-side integrity only. "Am I logged in" comes from the auth query cache, which `prefetchAuth` always seeds (the user object, or an explicit `null` for a guest), so a present-but-null entry is a definite guest and an absent one means not-yet-fetched. Do not reintroduce a `document.cookie` presence check.

If an upstream sync changes the login response shape, update `AuthResponseData` in `src/lib/api/auth.ts`: the generated `LoginData` is stale because upstream returns a raw gin body wider than its declared type, so `handleAuthResponse` reads the body structurally, not through the Orval type.

## Chat engine

Text chat is ISOMORPHIC and assembles IN THE BROWSER for both paths. Keep `src/lib/ai/chat/` free of server-only imports.

- DEFAULT (catalog model): the browser assembles, then `streamText` points at a same-origin proxy that injects the upstream token server-side. The token NEVER reaches the browser. `forward.service.ts` is JUST A PIPE: no assembly, no streamText, no finish-meta, no body mutation. Body mutations were already applied client-side by `makeBodyMutationFetch`, so re-applying them here would double them.
- CUSTOM (BYOK, `custom:::<providerId>:::<modelKey>`): browser streams DIRECTLY to the user's endpoint with the user's key, server never involved, UNLESS the provider row sets `proxy`, which routes through `custom-forward` for endpoints that serve no CORS headers.

`resolve-model-target.ts` is the SINGLE model-id -> target resolver. Every caller that reaches a model goes through it (live transport, dry-run, illustrator), so a custom-provider model uses the user's endpoint everywhere. This branch used to be copy-pasted across three files and the illustrator's copy was custom-blind.

**Chat route ordering is load-bearing.** `/custom-forward/*` and `/task/finalize` sit ABOVE the `.resolve` that injects `apiKey`/`userId`, so they never resolve a chat key; everything below does. custom-forward needs NO session because BYOK works for guests; what stops it being an anonymous open relay is that the caller's OWN `Authorization` is mandatory. The target arrives on `x-proxy-target` and passes the SSRF policy; no key is ever resolved, logged or stored.

**Stream-order rules are LOCKED** (the transform block in `pipeline/stages/role-transform.ts`; there is no marker comment, so keep this in step with the code): `dropFailedAssistantTurns` FIRST, before the strip pass erases the `data-error` part it keys on; `stripReasoningParts`; `stripSystemRole` BEFORE merge so system-as-user can collapse; `demoteLateSystem`; `dropEmptyMessages` BEFORE merge (dropping after can recreate consecutive same-role messages strict upstreams reject); `appendPrefill` BEFORE merge so a doubled trailing assistant folds; `mergeAlternateRoles`; `prependUserStub` after merge so merge cannot fold it; `appendUserStub` LAST (GLM "last role must be user"), skipped when a prefill is the intentional trailing assistant.

Provider role flags resolve through an ORDERED adapter list, FIRST MATCH WINS, so order matters: deepseek before glm, gemini-thinking before gemini, claude opus-5 before 4.5 before legacy. Adding a family = a new module + a registry line, never a central table edit. Flags OR with the preset's manual flags; a manual flag is never silently turned off. Request-mutation flags are consumed GENERICALLY by `build-body.ts`, never by provider-branching. o-series system->developer and max_completion_tokens renames are upstream's job, never re-mapped here.

A failed assistant turn is dropped WHOLE from request history: the partial text is a truncated reply, and sending it back made the model treat the fragment as canon and remark on the broken story.

Tokenizers are for history-fit and lorebook budgeting ONLY, never billing (new-api bills authoritatively), so any load failure falls back to approximate counting and NEVER throws. Tokenizer files are not bundled; HF `tokenizer.json` loads on demand and caches in SQLocal.

`freeModelRace` fires EVERY model `listFreeModels` returns concurrently, so that list must stay SHORT: server wiring passes the fixed `UTILITY_RACE_MODELS` trio, never the live free-model catalog (doing so cost ~172 upstream requests per title). Title gen goes through `freeModelRace` (a user-pinned title model replaces the trio, and its group pin is sent only then), and strips think-tags since an unclosed `<think>` would become the visible title.

Agents (`src/lib/ai/agents/`) are built-in behaviors running an auxiliary LLM call around generation, distinct from the user-authored trigger VM. CAPABILITY GATE: an agent declares `capabilities` and the runner refuses to apply a result whose capability was not declared, so a misconfigured agent cannot silently corrupt state. Both built-ins call the UTILITY model with full context, not the small-context free race. The illustrator fires ASYNC after the reply persists so it never blocks the reply.

Send-failure semantics (Risu parity): NO auto-replay. Client `streamText` uses `maxRetries: 0`; only server media generation retries, and only RETRYABLE 429/5xx/network. The user turn stays persisted and the user resends manually.

REQUEST HISTORY IS DB-SOURCED. `mergeDbHistory` takes the DB active branch as the base and appends only the captured tail the DB does not know yet. The useChat array is a RENDER PROJECTION, never the request source.

`seedConversation` is the ONE conversation-creation path, idempotent per convId, and MUST be awaited before send. assistant-ui runs `initialize` and the send wrapper concurrently with no ordering, which is the Marinara-class race (a fast first send assembled without the greeting) that every race-free client in a survey of 7 RP clients avoids by making creation awaited-before-send.

`triggers/lua/` keeps wasmoon out of browser bundles via lazy import + `serverExternalPackages` + a turbopack alias to `src/lib/empty-module.ts`. Removing either lands wasmoon's node path in the client bundle.

Plugins (`src/lib/ai/chat/plugins/`) are the SANDBOXED user-JS surface, a port of RisuAI's apiV3 (GPL-3.0, Copyright Kwaroran; combinable into this AGPL work under GPLv3 sec. 13). THE SECURITY BOUNDARY: user code runs in an iframe with `sandbox="allow-scripts"` ONLY, on an opaque origin with no reach into DOM/cookies/OPFS, under a CSP whose `connect-src 'none'` means a plugin CANNOT open its own network connections. `httpRequest` carries the Lua binding's exact egress policy (browser-only, https GET, length-capped, rate-limited). Display-mode handlers are read-only. A per-handler timeout means a broken plugin can never block a reply.

## PWA / service worker

The SW is served by an APP ROUTE, not `public/sw.js`. Every rule below exists because its absence broke production:

- `force-dynamic` + `no-store` (in BOTH `next.config.ts` headers and the handler response): the factory default `force-static` emits `s-maxage=1yr`, which once poisoned the Cloudflare edge un-purgeably.
- `navigationPreload` OFF so navigations route through the SW fetch and the offline fallback fires deterministically.
- `stopImmediatePropagation` for ALL cross-origin requests (defaultCache's catch-all would NetworkFirst third-party fetches, erroring when adblocked and caching opaque responses) and for worker/wasm/sqlocal (a cached stale worker/wasm pair desyncs from the app bundle and breaks OPFS opens).
- Navigations are `NetworkFirst` with NO networkTimeoutSeconds: a timeout served the PREVIOUS build's HTML on slow links, 404ing its chunks after deploys and killing every handler. The nav rule is a FUNCTION racing that strategy against `NAV_HANG_MS`, resolving only to the precached offline page, never to `pages`. Serwist serves `fallbacks` from `handlerDidError`, which fires only when a fetch REJECTS; a HUNG fetch never rejects, so without the race a stalled radio dies as `no-response` with no fallback. Because the handler is a function and not a `Strategy`, Serwist does NOT attach the fallback plugin to it, so it must resolve `matchPrecache` itself.
- `/en/offline` precached explicitly via `additionalPrecacheEntries`, because the serwist glob covers `_next` + `public/` but NOT rendered app-route HTML, so without it the fallback never matches.
- `install` waits (60s cap) until every open page reports `readyState === "complete"` over a MessageChannel, and the page registers the SW only after `load`. Safari kills the OLD worker as soon as a new one installs, even without skipWaiting, and a navigation still in flight under it then never completes: stuck progress bar, dead stop button, whole browser session wedged. With deploys minutes apart, every direct cold load of a heavy route (`/image`) lost that race.
- Build-scoped caches wiped in `activate`, so a deploy cannot mix old-build HTML/RSC with new chunks. The precache (`serwist-precache-v2-<scope>`) is NOT in that list, which is why the offline page survives a deploy.
- Two recovery paths in `recovery.ts` and they are NOT interchangeable: `clearServiceWorkerCaches` (Cache Storage + unregister) is safe and is what a stuck user should run; `clearAllClientStorage` also wipes OPFS, DESTROYING the local chat DB, which is the only copy. Never suggest "clear site data" to a user for a caching problem.

## i18n

18 locales in `public/i18n/`. `de.d.json.ts` is a GENERATED type declaration, not a locale: never hand-edit it, never count it when auditing coverage.

Messages PRECOMPILE at build, so `t.raw` is unsupported repo-wide and a typo'd ICU placeholder FAILS THE BUILD. Client payload is pruned in `src/i18n/client-messages.ts` and `ClientIntlProvider` THROWS on MISSING_MESSAGE in dev, so stripped-key use fails loudly.

`src/proxy.ts` is thin: a header plus next-intl middleware. Everything else is matcher config, and the extension list omits `.js` ON PURPOSE, since an unexcluded chunk gets locale-rewritten to `/en/_next/...` and 404s.

Consequence for `public/`: a `.js` file served from there is locale-rewritten and 404s, so the two console scripts users paste (`janitor-extract.js.txt`, `janitor-full-export.js.txt`) carry a `.txt` suffix to stay reachable. Do not rename them back.

`src/i18n/routing.ts` also exports `privateRoutes`, the single source of truth for robots Disallow and sitemap exclusions. Add a new authenticated route THERE, not in two places. robots emits end-anchored pairs because a bare prefix once swallowed `/hi/login` via `/hi/log`.

SEO timestamps are STATIC DATA on registry entries; nothing derives dates from git. New guide/doc/post = add its `date`; bump `updated` on real content edits.

Setup guides render from ONE dynamic route driven by the `SETUP_GUIDES` array, and `DOCS_REGISTRY` derives from it, so adding a guide is one object plus a `GUIDE_DATES` entry, never a new route or file.

## Misc traps

- Discord reward figures are FETCHED from the bot at render, not hardcoded and not in locale files. `FALLBACK` in `rewards.ts` is a last-known-good net, NOT the place to change a payout. Locale values carry the currency symbol; do not put `$` in the fetched value.
- Analytics: add events to `src/lib/analytics.ts` only, never call `posthog.capture` from a component. posthog-js is NEVER statically imported (63KiB gzip into every page bundle); all client callers use the queue-buffered shim.
- SSRF-safe fetch (`src/lib/config/safe-fetch.ts`) is mandatory for any remote fetch: CIDR + hostname blocklists, port allowlist, `redirect: "manual"`, a DNS resolver rejecting non-public addresses at connect time, a 50MB cap, and magic-byte verification against the declared content-type.
- Local DB Studio wipe destroys the SyncAccessHandle FIRST, else `removeEntry` is no-op'd by the lock. Export is NON-DESTRUCTIVE: it copies to a scratch file, deletes rows there, and streams that out; the live db is never touched.
- `confirm()` (`src/components/ui/confirm.tsx`) replaces `window.confirm` and is callable from any handler without context.
- Pending-task queue: ONE task type (`logEnrich`), deliberately not a generic engine. `resource-lock.ts` is NOT used by the queue; its callers are pool ownership and the per-conversation stream lock.
