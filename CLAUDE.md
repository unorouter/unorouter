> **Scope:** ONLY rules, invariants, load-bearing pairs and traps invisible at the call site. Not a tour: open the file. Where the code already comments the trap, one line here. When a change makes a rule wrong, fix it in the same commit.

Next.js 16 + Elysia BFF over our `new-api` fork. Local-first: one SQLocal/OPFS DB per device in the browser is the SOLE copy of chat/RP state; Turso holds only the model-tester rankings. "Sync" means atom<->local DB. Never add a server-side mirror, a `/sync` route, a server context cache, or a retry that expects the server to hold context.

## Dev

- NEVER start, restart or kill the dev server (`bun dev:log`, logs in `/tmp/next.log`). Read the log.
- NEVER `bun run build` or `rm -rf .next` while dev may run: shared turbopack cache, corrupts or kills the live server. Verify builds in a worktree:

```bash
git worktree add /tmp/uno-build HEAD && cd /tmp/uno-build && bun install && bun run build
git worktree remove --force /tmp/uno-build
```

- Local SSR hits `api.unorouter.com` without a session; `EDGE_DEV_TOKEN` in `.env` (value in `infra/infra/cloudflare/unorouter.com/rules*.sops.yaml`) exempts it. Symptom when stale: `Just a moment...` 403 in the log.
- `src/openapi.ts` is Orval output, never edit; `bun openapi`.

## Rules

- Translation keys UPPER_SNAKE nested, `msg()` outside React. `de.d.json.ts` is generated, not a locale.
- Dates via the `dayjs` singleton (`src/lib/utils/format/date.ts`), never raw `Date`.
- Enum-likes are TypeBox `t.Union([t.Literal()])` + derived type. No new TS `enum`; `src/lib/types/enums.ts` is grandfathered.
- `as`: delete the cast and run `bun typecheck`; still green means it was dead.
- Never refactor `src/components/ui/` for conciseness (shadcn/assistant-ui primitives).
- Local DB mutation, then `invalidateQueries`. No `setQueryData` patches, no optimistic rollback. React Query defaults `staleTime: Infinity`, no focus refetch, so nothing invalidates itself.
- ONE local database per device: `getLocalDb()` takes no argument. Only the model-tester tables carry `userId`, from `useAuthUserId()`/`authUserId()`. No client user-id atom, no per-user OPFS path.
- Pass upstream shapes through; when the shape is wrong, fix it in new-api (ours), never remap, filter, sort, count or cache in the BFF. Target route body: `async () => getSomething()`. BFF keeps auth, cookies, composing several upstream calls and unorouter-only view state. `handleElysia` unwraps `{success, data}` and DROPS siblings, so our own DTOs never use that envelope. Pass-through routes `return unwrap(res)`; local-logic routes (`ai/chat`, `ops/health`) `return { success, data }`; never mix in one route. No try/catch in handlers.
- Dependency direction one way: `route.ts` -> `*.service.ts` -> data. `src/lib/ai/chat/` is PURE of secrets and data sources; everything injected through `AssemblerDeps` (`pipeline/deps.ts`). `providers/` and `agents/` are leaf modules.
- Any remote fetch goes through `src/lib/config/safe-fetch.ts` (SSRF policy). Analytics events only via `src/lib/analytics.ts`; posthog-js is never statically imported.
- nuqs owns URL filter state; never `useSearchParams` + `router.replace`. `/models` bridges nuqs to jotai at the store level (cookie hydration lands after first-commit subscribers).
- jotai: `chatStore.set(atom, fn)` runs fn as an updater. `set(atom, () => fn)`.

## Rendering and caching

- No COOP/COEP anywhere (opfs-sahpool needs none; COEP forced full reloads and broke embeds). Badge route sets CORP on its own responses.
- `cacheComponents` OFF, no `use cache`: it double-rendered every cookie-reading route. React `cache()` is per-request dedup; the only TTL caches are module-state (benchmarks permaslug 30d, runware catalog 30min). Anything feeding a module cache must NOT fetch with `customFetch` defaults: it attaches the caller's cookies, so a URL key serves one user's data to all.
- ZERO `<Suspense>` in `src/`. A suspending hook or `next/dynamic` chunk suspends to the ROOT; if that bites, one targeted boundary at the component, never a layout gate.
- `(sidebar)` layout IS the auth gate (awaits self lookup, `redirectToLogin()`); it stays a plain async layout, a Suspense wrapper commits 200 before the redirect.
- Next 16 does not fire `[locale]/not-found.tsx` for child `notFound()`; each route group needs its own.

## Client DB (SQLocal / opfs-sahpool)

Four guards in `src/lib/db/client/`, each commented at the site with its data-loss mode. Read before touching: orphaned-pool guard (`assertNotSilentlyEmptied`, non-recoverable ON PURPOSE, bytes stay for `sahpool/salvage.ts`), never-blind-wipe retries in `openMigratedSql`, multi-tab handover (`want` re-sent on an interval; hidden tab parks immediately because frozen owners never answer), Safari legacy copy (legacy file removed even when the copy fails, else it re-imports over newer data).

- Migrations: forward-only, NO transaction wrapper, three passes (replay, `reconcileSchema` which aborts rather than drop ROWS, `validateColumns`).
- `reconcileImport`: invariants are commented inline (live written exactly once, backup kept until verified, `LOCAL_ONLY_TABLES` never copied, `ArrayBuffer` only). `recoverPendingImport` runs BEFORE `openMigratedSql`.
- Schema: `shared.ts` both DBs, `client.ts` client-only, `rows.ts` row types. Model-tester tables are ONE definition; server rows use `userId = 0` so `(userId, kind, host)` acts as a global key.
- `messages.branch_vars` isolates sibling swipes: assembly seeds from the ACTIVE TIP, falls back to `conversations.vars`; persist writes this turn's `varsWriteback` else the parent's. Output-mode triggers still write `conversations.vars` directly (known).
- Settings > Database export runs inside the live pool (`VACUUM INTO` temp slot, drop `tokenizers`, export via `sahpool-export-file`), one materialization; the old copy-to-main-thread shape OOM-killed iPhone tabs. Wipe destroys the SyncAccessHandle first.
- `clearServiceWorkerCaches` is the safe fix for a stuck user; `clearAllClientStorage` wipes OPFS, the only copy. Never suggest "clear site data".

## State and auth

- Atoms load their cookie AFTER mount (no `getOnInit`). `chatStoreAtom` is the one exception: `getOnInit: true` PAIRED with server-side `ChatStoreProvider` seeding; removing either brings back the #418 mismatch or the cookie-spread data loss.
- `useSettingsSync` MUST NOT write `chatDefaultsAtom` (sticky new-chat defaults, drawer save only). Provider-group pin keys by active model, not conversation.
- Cookies: `access_token` (30d, no refresh flow; revocation means shorter TTL or session-row check, not `/auth/refresh`), `user-id` (iron-session, `SESSION_SECRET` >= 32, client never reads it; rotating it logs everyone out at once, since a cookie sealed under the old value verifies as a guest, so move the old value into `SESSION_SECRET_PREVIOUS` in the same patch and drop it 30 days later: 2026-09-06 did it without, 401s mid-chat for every user), `client-store` (user's API key), `edge-session` (HMAC with `EDGE_SESSION_SECRET`, verified by the first Cloudflare rule; secret lives in OpenBao AND the sops rules file, rotate both or every logged-in user drops to guest rules).
- "Am I logged in" comes from the auth query cache seeded by `prefetchAuth` (user or explicit `null`); never a `document.cookie` check.
- Login response is a raw gin body wider than `LoginData`; `handleAuthResponse` reads it structurally via `AuthResponseData` in `src/lib/api/auth.ts`.

## Chat engine

- Assembles IN THE BROWSER for both paths. Catalog: same-origin proxy injects the token; `forward.service.ts` is JUST A PIPE (mutations already applied by `makeUpstreamFetch`, which also strips the SDK `user-agent` for the edge). BYOK: browser to user endpoint directly, `custom-forward` only when the provider row sets `proxy`.
- `resolve-model-target.ts` is the single model-id -> target resolver; every caller uses it.
- Chat route order is load-bearing (commented in `route.ts`): `/custom-forward/*` and `/task/finalize` above the key-resolving `.resolve`.
- Stream transform order in `pipeline/stages/role-transform.ts` is LOCKED and has no marker: `dropFailedAssistantTurns`, `stripReasoningParts`, `stripSystemRole`, `demoteLateSystem`, `dropEmptyMessages`, `appendPrefill`, `mergeAlternateRoles`, `prependUserStub`, `appendUserStub` (skipped when a prefill is the intended trailing assistant). Each earlier step exists so a later one can fold or cannot recreate what it removed.
- Provider adapters: ordered list, FIRST MATCH WINS (deepseek before glm, gemini-thinking before gemini, claude opus-5 before 4.5 before legacy). New family = module + registry line. Flags OR with preset flags. o-series renames are upstream's job.
- Failed assistant turns are dropped WHOLE from history. No auto-replay: `maxRetries: 0` on the client, only server media retries on 429/5xx.
- Tokenizers are for budgeting only, never billing; load failure falls back to approximate, never throws. Loaded on demand from HF, cached in SQLocal.
- `freeModelRace` fires every model in its list concurrently, so server wiring passes the fixed `UTILITY_RACE_MODELS` trio, never the live free catalog (was 172 requests per title). Title gen strips think-tags.
- Agents: capability gate, runner refuses results whose capability was not declared. Illustrator fires async after persist.
- Request history is DB-sourced (`mergeDbHistory`); the useChat array is a render projection. `seedConversation` is the one creation path and MUST be awaited before send.
- `triggers/lua/`: lazy import + `serverExternalPackages` + turbopack alias to `empty-module.ts`; removing any lands wasmoon's node path in the client bundle.
- Plugins (`plugins/`, RisuAI apiV3 port, GPL-3.0 Kwaroran) run in an `allow-scripts`-only iframe with `connect-src 'none'`; `httpRequest` is the only egress and carries the Lua policy. Bridged capabilities execute on the HOST origin: check ambient authority before exposing one.

## Service worker and edge

`src/app/sw.ts` and `sw-register.tsx` comment every rule with its incident. Not in the code:

- Cloudflare `/_next/static/` rule (1y) MUST carry `status_code_ttl 400-599 = -1`; anonymous HTML cache rule needs `status_code_ttl 300-599 = -1` and `browser_ttl bypass`. A cached rollout 404 killed every page on a colo, twice. `build-local.sh` purges page URLs post-deploy (`purge_token` in OpenBao `secret/cloudflare-edge`); never `purge_everything`.
- `build-local.sh` refuses a second deploy inside 30 min without `--now` (each deploy is a SW update for every open tab).
- Point a stuck user at `unorouter.com/en/recover` (inline script, precached, works while the worker is wedged).
- `/en/offline` is in `additionalPrecacheEntries`; the serwist glob never covers rendered HTML.

## i18n and routing

- 18 locales in `public/i18n/`. Messages precompile: `t.raw` unsupported, bad ICU fails the build, missing key throws in dev.
- `src/proxy.ts` stays thin. Edge cacheability of anonymous pages is decided by Cloudflare rules generated from `pathnames` (sops file above), not headers here. The matcher omits `.js` on purpose, so `.js` files in `public/` 404 (hence `janitor-*.js.txt`).
- `privateRoutes` in `src/i18n/routing.ts` is the single source for robots Disallow and sitemap exclusion; robots emits end-anchored pairs.
- SEO dates are static registry data (`GUIDE_DATES`); setup guides are one route over `SETUP_GUIDES`, `DOCS_REGISTRY` derives from it.
- Discord reward figures are fetched from the bot at render; `FALLBACK` in `rewards.ts` is not where payouts change.
