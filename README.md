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

## The three surfaces

### 1. Gateway dashboard

The account side of the UnoRouter API. Dashboard (usage, quota, uptime), token management with per-model provider-group pinning, billing checkout (Stripe/Creem), affiliate badges, request logs. Mostly thin pass-throughs to the upstream `new-api` gateway via the Orval-generated client.

### 2. Chat (internal API or BYOK)

The text chat engine is isomorphic and runs IN THE BROWSER for both paths; the only difference is the endpoint + token:

- **Internal (catalog model)** - the browser assembles the request, then `streamText` points at a same-origin proxy (`/api/ai/chat/forward`) that injects the upstream token server-side and raw-pipes the SSE to `new-api`. The token never reaches the browser.
- **BYOK (custom provider)** - 100% client-side: the browser streams directly to the user's own OpenAI-compatible endpoint with the user's own key. The server is never involved. Per-model tokenizers (built-in presets or a HuggingFace `tokenizer.json` by URL), loaded on demand and cached locally rather than bundled.

A single `resolveModelTarget` resolves any model id (catalog or `custom:::`) to its endpoint/key/deps, so every caller (live transport, dry-run, illustrator) reaches the right place.

RP features (RisuAI-derived, cleaned up):

- Orderable prompt template, single-pool lorebooks with `@@decorators`, CBS macros, regex scripts, Lua triggers (wasmoon), multi-character group rotation
- Characters / personas / lorebooks / presets / cards; SillyTavern card v2/v3 import; duplicate across all entity types
- Branch editing (swipes) with branch-scoped chat variables (sibling swipes don't leak each other's `setvar` state)
- **Agent pipeline** - a declarative layer for built-in behaviors that run an auxiliary LLM call around the main generation: rolling-summary memory and an in-chat illustrator (a second LLM writes an image prompt from the latest reply, then generates an inline image async without blocking the reply). Both call a full-context utility model, not the small free-model race. New behaviors are a folder + a registry line; a capability gate stops an agent applying an effect it didn't declare.
- In-chat image generation (SDXL, Flux, GPT Image, Gemini, Civitai checkpoints via Runware) with reference images, prompt verify/regenerate, and per-conversation model choice
- Tavily web search (paid gate); prompt moderation is enforced upstream in `new-api`, with a per-user exemption flag
- Conversation export/import (native, orpg, SillyTavern JSONL); Local DB Studio (OPFS inspector, export, import, orphan recovery)
- Works offline for guests and logged-in users; multiple tabs cooperate over a single OPFS pool via on-demand ownership handover

### 3. AI API Model Tester

Probes an AI endpoint with deterministic, nonce-tagged prompts to detect whether it serves the model it claims - or a cheaper/fake substitute. Signals include CJK reasoning leaks, foreign self-identity, scam landing pages, coding-tool refusals, fake-response signatures, and cloud-host patterns; the runner aggregates the per-probe signals into a verdict: `genuine` / `suspicious` / `unverified`. A server-issued probe mode (the server issues the prompts and reads the upstream responses, the client never produces them) makes a published result unforgeable. Runs client-side with local history; results feed a public rankings leaderboard (`/ai-api-model-tester`, `/ai-api-model-tester/rankings`) and published rows are owner-retractable.

## Architecture

BFF in front of `new-api`. Pass-through routes (`auth`, most `billing`, `models`, `ops`) return `unwrap(res)`. Local-logic routes (`ai/chat`, `ops/health`) return `{ success, data }`. Server domains under `src/server/`: `ai/{chat,character-cards}`, `auth/`, `billing/`, `models/`, `ops/`.

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

| Script            | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `bun dev:log`     | Dev server (logs to `/tmp/next.log`)                      |
| `bun build`       | Production build (prebuild: search index + bundled migrations) |
| `bun lint`        | ESLint                                                    |
| `bun typecheck`   | `tsc --noEmit`                                            |
| `bun prettier`    | Format                                                    |
| `bun openapi`     | Regen `src/openapi.ts` from upstream                      |
| `bun db:generate` | Drizzle migrations (server + client) + bundle for SQLocal  |
