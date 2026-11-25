> **Scope:** ONLY rules, invariants, load-bearing pairs and traps invisible at the call site. Not a tour, open the file. Where the code already comments the trap, one line here. When a change makes a rule wrong, fix it in the same commit.

Next.js 16 + Elysia BFF over our `new-api` fork. Local-first. One SQLocal/OPFS DB per device in the browser is the SOLE copy of chat/RP state. Turso holds only the model-tester rankings. "Sync" means atom<->local DB. Never add a server-side mirror, a `/sync` route, a server context cache, or a retry that expects the server to hold context.

## Dev

- NEVER start, restart or kill the dev server (`bun dev:log`, logs in `/tmp/next.log`). Read the log.
- NEVER `bun run build` or `rm -rf .next` while dev may run. The turbopack cache is shared and it corrupts or kills the live server. Verify builds in a worktree.

```bash
git worktree add /tmp/uno-build HEAD && cd /tmp/uno-build && bun install && bun run build
git worktree remove --force /tmp/uno-build
```

- Local SSR hits `api.unorouter.com` without a session. `EDGE_DEV_TOKEN` in `.env` (value in `infra/infra/cloudflare/unorouter.com/rules*.sops.yaml`) exempts it. Stale token shows as `Just a moment...` 403 in the log.
- `src/openapi.ts` is Orval output, never edit. Run `bun openapi`.

## Rules

- Translation keys UPPER_SNAKE nested, `msg()` outside React. `de.d.json.ts` is generated, not a locale.
- Dates via the `dayjs` singleton (`src/lib/utils/format/date.ts`), never raw `Date`.
- Enum-likes are TypeBox `t.Union([t.Literal()])` + derived type. No new TS `enum`. `src/lib/types/enums.ts` is grandfathered.
- `as`: delete the cast and run `bun typecheck`. Still green means it was dead.
- Never refactor `src/components/ui/` for conciseness (shadcn/assistant-ui primitives).
- Local DB mutation, then `invalidateQueries`. No `setQueryData` patches, no optimistic rollback. React Query defaults are `staleTime: Infinity` with no focus refetch, so nothing invalidates itself.
- ONE local database per device. `getLocalDb()` takes no argument. Only the model-tester tables carry `userId`, from `useAuthUserId()`/`authUserId()`. No client user-id atom, no per-user OPFS path.
- Pass upstream shapes through. When a shape is wrong, fix it in new-api (ours), never remap, filter, sort, count or cache in the BFF. Target route body is `async () => getSomething()`. BFF keeps auth, cookies, composing several upstream calls and unorouter-only view state. `handleElysia` unwraps `{success, data}` and DROPS siblings, so our own DTOs never use that envelope. Pass-through routes `return unwrap(res)`, local-logic routes (`ai/chat`, `ops/health`) `return { success, data }`, never mix in one route. No try/catch in handlers.
- Dependency direction is one way, `route.ts` -> `*.service.ts` -> data. `src/lib/ai/chat/` is PURE of secrets and data sources, everything injected through `AssemblerDeps` (`pipeline/deps.ts`). `providers/` is a leaf module.
- Any remote fetch of a URL a user or provider chooses goes through `src/lib/config/safe-fetch.ts`. The cluster refuses them too (Cilium `private-egress-deny` in infra `services/cluster-egress.yaml`). Local dev has no such guard.
- nuqs owns URL filter state, never `useSearchParams` + `router.replace`. `/models` bridges nuqs to jotai at the store level (cookie hydration lands after first-commit subscribers).
- jotai `chatStore.set(atom, fn)` runs fn as an updater. Use `set(atom, () => fn)`.

## Rendering and caching

- No COOP/COEP anywhere (opfs-sahpool needs none, COEP forced full reloads and broke embeds). Badge route sets CORP on its own responses.
- `cacheComponents` OFF, no `use cache` (it double-rendered every cookie-reading route). React `cache()` is per-request dedup. The only TTL caches are module state. Anything feeding a module cache must NOT fetch with `customFetch` defaults. It attaches the caller's cookies, so a URL key serves one user's data to all.
- ZERO `<Suspense>` in `src/`. A suspending hook or `next/dynamic` chunk suspends to the ROOT. If that bites, one targeted boundary at the component, never a layout gate.
- `(sidebar)` layout IS the auth gate (awaits self lookup, `redirectToLogin()`). It stays a plain async layout, a Suspense wrapper commits 200 before the redirect.
- Next 16 does not fire `[locale]/not-found.tsx` for child `notFound()`. Each route group needs its own.

## Client DB (SQLocal / opfs-sahpool)

Four guards in `src/lib/db/client/`, each commented at the site with its data-loss mode. Read before touching. Orphaned-pool guard (`assertNotSilentlyEmptied`, non-recoverable ON PURPOSE, bytes stay for `sahpool/salvage.ts`), never-blind-wipe retries in `openMigratedSql`, multi-tab handover, Safari legacy copy.

- Migrations are forward-only, NO transaction wrapper, three passes (replay, `reconcileSchema` which aborts rather than drop ROWS, `validateColumns`).
- `reconcileImport` invariants are commented inline. `recoverPendingImport` runs BEFORE `openMigratedSql`.
- Schema: `shared.ts` both DBs, `client.ts` client-only, `rows.ts` row types. Model-tester tables are ONE definition. Server rows use `userId = 0` so `(userId, kind, host)` acts as a global key.
- `messages.branch_vars` isolates sibling swipes. Assembly seeds from the ACTIVE TIP, falls back to `conversations.vars`. Persist writes this turn's `varsWriteback` else the parent's, output triggers run from that, and their result becomes the reply's `branch_vars`.
- `patches/@sqlite.org%2Fsqlite-wasm@<version>.patch` stops iOS from wiping the pool (a short header read fails the open, a failed install keeps the pool on disk, a slot holding data keeps its name). Upstream took the header half (trunk 341525ecfd, after 3.54.1). Delete the patch once a sqlite-wasm release carries it. Until then bun silently skips a patch whose version no longer matches, so carry it over on every bump and grep the worker chunk for "Short read of a pool file header" after deploy. Short reads of data pages are guarded by `sahpool/short-read-guard.ts` instead (upstream declined them).
- Settings > Database export runs inside the live pool, one materialization. Copying to the main thread OOM-killed iPhone tabs. Wipe destroys the SyncAccessHandle first. When the DB will not open, export downloads the raw slot file (`downloadRawLocalDb`).
- `clearServiceWorkerCaches` is the safe fix for a stuck user. `clearAllClientStorage` wipes OPFS, the only copy. Never suggest "clear site data".

## State and auth

- Atoms load their cookie AFTER mount (no `getOnInit`). Two exceptions, each `getOnInit: true` PAIRED with a server-seeding provider. Removing either half breaks them. `chatStoreAtom` + `ChatStoreProvider` (else the #418 mismatch or cookie-spread data loss). `userThemeAtom` + `UserThemeStoreProvider` (else the unseeded first render overwrites the layout's `<style id="user-theme">` with default CSS and chat markdown colours vanish).
- Theme knobs are tokens in `src/lib/theme/tokens.ts` or presets feeding `generatePalette`. CSS variables are emitted only by `build-css.ts`, static readers of a token var live in `globals.css`. Scopes (`chat`, `image`) carry only their own overrides. The cookie is versioned (`v: 2`) and `migrateTheme` runs on every read, keep old cookies, history rows and files working.
- `useSettingsSync` MUST NOT write `chatDefaultsAtom` (sticky new-chat defaults, drawer save only). Provider-group pin keys by active model, not conversation.
- Cookies. `access_token` is 30d with no refresh flow (revocation means shorter TTL or a session-row check, not `/auth/refresh`). `user-id` is iron-session, `SESSION_SECRET` >= 32, client never reads it. Rotating it logs everyone out, so move the old value into `SESSION_SECRET_PREVIOUS` in the same patch and drop it 30 days later (2026-09-06 skipped that, 401s mid-chat for every user). `client-store` holds the user's API key. `edge-session` is HMAC with `EDGE_SESSION_SECRET`, verified by the first Cloudflare rule. That secret lives in OpenBao AND the sops rules file, rotate both or every logged-in user drops to guest rules.
- "Am I logged in" comes from the auth query cache seeded by `prefetchAuth` (user or explicit `null`), never a `document.cookie` check.
- Login response is a raw gin body wider than `LoginData`. `handleAuthResponse` reads it structurally via `AuthResponseData`.

## Chat engine

- Assembles IN THE BROWSER for both paths. Catalog goes through the same-origin proxy that injects the token. `forward.service.ts` is JUST A PIPE (`makeUpstreamFetch` already applied mutations and strips the SDK `user-agent` for the edge). BYOK goes browser to user endpoint directly, `custom-forward` only when the provider row sets `proxy`.
- `resolve-model-target.ts` is the single model-id -> target resolver. Every caller uses it.
- Chat route order is load-bearing (commented in `route.ts`). `/custom-forward/*` sits above the key-resolving `.resolve`. `/task/finalize` sits BELOW it and takes the result URL from the caller's own task, never from the body (an anonymous 50 MB fetcher until 2026-11-10). Relay streams resume only for signed-in callers and in their own `StreamPool` "relay" (a shared pool let a relay flood evict paid replies).
- Stream transform order in `pipeline/stages/role-transform.ts` is LOCKED and has no marker: `dropFailedAssistantTurns`, `stripReasoningParts`, `stripSystemRole`, `demoteLateSystem`, `dropEmptyMessages`, `appendPrefill`, `mergeAlternateRoles`, `prependUserStub`, `appendUserStub` (skipped only when a prefill is the intended trailing assistant AND the adapter sets `prefillSupported`, Gemini 400s on a trailing model turn), `appendReasoningPrefill` (last, so nothing folds the seeded reasoning away). Each earlier step exists so a later one can fold or cannot recreate what it removed.
- Provider adapters are an ordered list, FIRST MATCH WINS (deepseek before glm, gemini-thinking before gemini, claude opus-5 before 4.5 before legacy). New family = module + registry line. Flags OR with preset flags. o-series renames are upstream's job.
- Chat resume. The writing process buffers every reply (`stream-buffer.ts`). With `REDIS_SENTINEL_ADDRS` set, `stream-mirror.ts` copies it to the GATEWAY's Redis so any replica resumes it. That Redis is small `volatile-lru` and holds gateway keys, so keep the mirror caps. Replicas never call each other (a `pod=` resume hint was the 2026-11-10 DoS).
- Failed assistant turns are dropped WHOLE from history. No auto-replay, `maxRetries: 0` on the client, only server media retries on 429/5xx.
- Tokenizers are for budgeting only, never billing. Load failure falls back to approximate, never throws.
- `freeModelRace` fires every model in its list at once, so server wiring passes the fixed `UTILITY_RACE_MODELS`, never the live free catalog. Title gen strips think-tags.
- Illustrator fires async after persist.
- Request history is DB-sourced (`mergeDbHistory`). The useChat array is a render projection. `seedConversation` is the one creation path and MUST be awaited before send.
- `triggers/lua/` needs lazy import + `serverExternalPackages` + turbopack alias to `empty-module.ts`. Removing any lands wasmoon's node path in the client bundle.
- Plugins (`plugins/`, RisuAI apiV3 port, GPL-3.0 Kwaroran) run in an `allow-scripts`-only iframe with `connect-src 'none'`. `httpRequest` is the only egress and carries the Lua policy. Bridged capabilities execute on the HOST origin, check ambient authority before exposing one.

## Service worker and edge

`src/app/sw.ts` and `sw-register.tsx` comment every rule with its incident. Not in the code:

- Cloudflare `/_next/static/` rule (1y) MUST carry `status_code_ttl 400-599 = -1`. The anonymous HTML cache rule needs `status_code_ttl 300-599 = -1` and `browser_ttl bypass`. A cached rollout 404 killed every page on a colo, twice. Never `purge_everything`.
- Each deploy is a SW update for every open tab, so do not deploy twice within 30 min.
- Point a stuck user at `unorouter.com/en/recover` (inline script, precached, works while the worker is wedged).
- `/en/offline` is in `additionalPrecacheEntries`. The serwist glob never covers rendered HTML.

## i18n and routing

- 18 locales in `public/i18n/`. Messages precompile, so `t.raw` is unsupported, bad ICU fails the build, a missing key throws in dev.
- Browser source maps stay private. `NBC_PRIVATE_SOURCEMAPS=1` in the Dockerfile keeps `.map` files out of the next-bun-compile binary, and the Dockerfile copies them to `sourcemaps/` for GlitchTip. After a next-bun-compile bump, check that a `/_next/static/**/*.map` URL answers 404.
- `src/proxy.ts` stays thin. Edge cacheability of anonymous pages is decided by Cloudflare rules generated from `pathnames`. Its one header is `Cache-Control` with `stale-while-revalidate`/`stale-if-error` on anonymous documents, because Cloudflare Pro serves stale only when the origin allows it. Its cookie exclusions must match the cache rule. It requires `Accept: text/html`, since Next hides the RSC header and `_rsc` param from middleware. The matcher omits `.js` on purpose, so `.js` files in `public/` 404.
- `privateRoutes` in `src/i18n/routing.ts` is the single source for robots Disallow and sitemap exclusion. Its `noindex` list is sitemap-excluded but NOT disallowed, so Google can read `robots: false`. A page there must set it.
- SEO dates are static registry data (`GUIDE_DATES`). Setup guides are one route over `SETUP_GUIDES`, `DOCS_REGISTRY` derives from it.
- Discord reward figures are fetched from the bot at render. `FALLBACK` in `rewards.ts` is not where payouts change.
