# UnoRouter

A local-first frontend for the UnoRouter AI gateway. Three surfaces in one app:

1. **Gateway dashboard** - manage API keys, usage, billing, and credits for the UnoRouter API (a `new-api` gateway over 130+ upstream providers).
2. **Chat** - a full RisuAI-class roleplay/chat client. Use the gateway's catalog models (internal API) or bring your own provider (BYOK). Characters, lorebooks, presets, agents, in-chat image generation.
3. **AI API Model Tester** - probe any AI endpoint to verify it actually serves the model it claims, with a public rankings leaderboard.

Next.js 16 frontend + Elysia BFF. A per-user SQLocal/OPFS browser DB is the sole source of truth for chat/RP/tester state - everything works for guests, no account needed. Cross-device transfer is local export/import; the server DB holds only the public model-tester rankings.

## Stack

- Next.js 16, React 19 (compiler), Tailwind v4, shadcn/ui
- Jotai, React Query 5, nuqs, next-intl (18 locales)
- Elysia on Bun, TypeBox, Eden Treaty, Orval-generated upstream client
- Drizzle ORM: SQLocal over the SQLite WASM opfs-sahpool VFS (client, source of truth) + Turso/libSQL (server, rankings only)
- Vercel AI SDK (`@ai-sdk/openai-compatible`), assistant-ui, wasmoon (Lua), Tavily web search
- Serwist service worker (PWA + offline fallback), SSRF-safe undici fetch
- PostHog, Pino, Orama, Satori

## Chat

The text chat engine is isomorphic and runs IN THE BROWSER for both paths; only the endpoint and token differ. With a catalog model the browser assembles the request and points `streamText` at a same-origin proxy that injects the upstream token server-side, so the token never reaches the browser. With BYOK it streams straight to the user's own OpenAI-compatible endpoint with their own key and the server is never involved. One `resolveModelTarget` resolves either kind of model id, so every caller (live transport, dry-run, illustrator) reaches the right place.

RP features are RisuAI-derived: orderable prompt template, single-pool lorebooks with `@@decorators`, CBS macros, regex scripts, Lua triggers (wasmoon), sandboxed user-JS plugins, multi-character group rotation, SillyTavern card v2/v3 import, and branch editing whose chat variables are branch-scoped so sibling swipes cannot leak each other's `setvar` state. An agent pipeline adds built-in behaviors that run an auxiliary LLM call around the main generation: rolling-summary memory and an in-chat illustrator that writes an image prompt from the latest reply and generates asynchronously without blocking it. Per-model tokenizers load on demand rather than being bundled. Image generation covers SDXL, Flux, GPT Image, Gemini and Civitai checkpoints via Runware, with reference images and prompt verify/regenerate. Web search is Tavily behind a paid gate; prompt moderation is enforced upstream in `new-api`.

Everything works offline and for guests, multiple tabs cooperate over a single OPFS pool via on-demand ownership handover, and conversations export/import as native, orpg or SillyTavern JSONL. A Local DB Studio inspects, exports, imports and recovers the browser database.

## AI API Model Tester

Probes an AI endpoint with deterministic, nonce-tagged prompts to detect whether it serves the model it claims or a cheaper substitute. Signals include CJK reasoning leaks, foreign self-identity, scam landing pages, coding-tool refusals, fake-response signatures and cloud-host patterns, aggregated into a `genuine` / `suspicious` / `unverified` verdict. A server-issued probe mode, where the server issues the prompts and reads the upstream responses so the client never produces them, makes a published result unforgeable. Runs client-side with local history; results feed a public leaderboard and published rows stay owner-retractable.

## Architecture

BFF in front of `new-api`. Pass-through routes (`auth`, most `billing`, `models`, `ops`) return `unwrap(res)`. Local-logic routes (`ai/chat`, `ops/health`) return `{ success, data }`. Server domains under `src/server/`: `ai/{chat,character-cards,image}`, `auth/`, `billing/`, `models/`, `ops/`.

```
TypeBox -> Elysia -> Eden Treaty -> handleElysia() -> React Query
```

Local-first DB: SQLocal over the opfs-sahpool VFS, one file per user, no COOP/COEP required. On open, migrations run forward-only, then `reconcileSchema` self-heals drifted tables (aborting rather than dropping rows), then `validateColumns` is a last-resort net that re-adds any missing column so a stale browser DB never crashes at query time. An orphaned-pool guard detects the case where a torn file header would otherwise make the app look wiped, and surfaces a recovery path instead. RP/chat/tester entities live only in SQLocal; mutations write the local DB then `invalidateQueries`.

Guest mode runs the full feature set with no account (a server-side guest key backs catalog calls).

## Setup

```bash
bun install
bun dev
```

Prereqs: Bun and an upstream `new-api` gateway. `SESSION_SECRET` (>= 32 chars) and `SYSTEM_ACCESS_TOKEN` are required and fail fast at module load. Turso is optional (only the model-tester rankings need it; absent means the server DB is disabled). Tavily is optional. No object storage: chat media lives as base64 in the browser's OPFS. Copy `.env.example` to `.env`.

## Scripts

`bun dev:log` (dev server, logs to `/tmp/next.log`), `bun build`, `bun lint`, `bun typecheck`, `bun prettier`, `bun openapi` (regenerate the upstream client), `bun db:generate` (Drizzle migrations for both DBs + bundle for SQLocal).
