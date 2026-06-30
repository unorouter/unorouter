# UnoRouter

A local-first frontend for the UnoRouter AI gateway. Three surfaces in one app:

1. **Gateway dashboard** - manage API keys, usage, billing, and credits for the UnoRouter API (a `new-api` gateway over 20+ providers).
2. **Chat** - a full RisuAI-class roleplay/chat client. Use the gateway's catalog models (internal API) or bring your own provider (BYOK). Characters, lorebooks, presets, agents, image/video playground.
3. **AI API Model Tester** - probe any AI endpoint to verify it actually serves the model it claims, with a public rankings leaderboard.

Next.js 16 frontend + Elysia BFF. A per-user SQLocal/OPFS browser DB is the sole source of truth for chat/playground/RP/tester state - everything works for guests, no account needed. Cross-device transfer is local export/import (the Turso mirror sync was removed; the server schema stays for re-adding it later).

## Stack

- Next.js 16, React 19 (compiler), Tailwind v4, shadcn/ui
- Jotai, React Query 5, next-intl (18 locales)
- Elysia on Bun, TypeBox, Eden Treaty, Orval-generated upstream client
- Drizzle ORM: SQLocal/OPFS (client, source of truth) + Turso/libSQL (server, dormant mirror)
- Vercel AI SDK (`@ai-sdk/openai-compatible`), Tavily web search, Creem moderation
- Cloudflare R2 with SSRF-safe undici fetch
- PostHog, Pino, Orama, Satori

## The three surfaces

### 1. Gateway dashboard

The account side of the UnoRouter API. Dashboard (usage, quota, uptime), token management, billing + ACP checkout (Stripe/Creem, Idempotency-Key), affiliate badges, request logs. These are mostly thin pass-throughs to the upstream `new-api` gateway via the Orval-generated client.

### 2. Chat (internal API or BYOK)

The text chat engine is isomorphic and runs IN THE BROWSER for both paths; the only difference is the endpoint + token:

- **Internal (catalog model)** - the browser assembles the request, then `streamText` points at a same-origin proxy (`/api/ai/chat/forward`) that injects the upstream token server-side and raw-pipes the SSE to `new-api`. The token never reaches the browser.
- **BYOK (custom provider)** - 100% client-side: the browser streams directly to the user's own OpenAI-compatible endpoint with the user's own key. The server is never involved. Per-model tokenizers (built-in presets or a HuggingFace `tokenizer.json` by URL).

A single `resolveModelTarget` resolves any model id (catalog or `custom:::`) to its endpoint/key/deps, so every caller (live transport, dry-run, agents) reaches the right place.

RP features (RisuAI-derived, cleaned up):

- Orderable prompt template, single-pool lorebooks with `@@decorators`, CBS macros, regex scripts, Lua triggers (wasmoon), multi-character group rotation
- Characters / personas / lorebooks / presets / cards; SillyTavern card v2/v3 import; duplicate across all entity types
- Branch editing (swipes) with branch-scoped chat variables (sibling swipes don't leak each other's `setvar` state)
- **Agent pipeline** - a declarative layer for built-in behaviors that run an auxiliary LLM call around the main generation: rolling-summary memory (uses a full-context utility model, not the small free models) and an in-chat illustrator (a second LLM writes an image prompt from the latest reply, then generates an inline image async without blocking the reply). New behaviors are a folder + a registry line; a capability gate stops an agent applying an effect it didn't declare.
- Image + video playground: SDXL, Flux, FLUX Kontext, GPT Image, Gemini; Img2Img/Upscale/ADetailer/Inpaint; async video task polling + R2 rehosting
- Tavily web search (paid gate), Creem prompt moderation
- Conversation export/import (native, orpg, SillyTavern JSONL); Local DB Studio (OPFS inspector + import)

### 3. AI API Model Tester

Probes an AI endpoint with deterministic, nonce-tagged prompts to detect whether it serves the model it claims - or a cheaper/fake substitute. Signals include CJK reasoning leaks, foreign self-identity, scam landing pages, coding-tool refusals, fake-response signatures, and cloud-host patterns; the runner aggregates the per-probe signals into a verdict: `genuine` / `suspicious` / `unverified`. A server-issued probe mode (the server issues the prompts and reads the upstream responses, the client never produces them) makes a published result unforgeable. Runs client-side with local history; results feed a public rankings leaderboard (`/ai-api-model-tester`, `/history`, `/rankings`) and published rows are owner-retractable.

## Architecture

BFF in front of `new-api`. Pass-through routes (`auth`, most `billing`, `models`, `ops`) return `unwrap(res)`. Local-logic routes (`ai/chat`, `ai/playground`, `models/model-tester`, `billing/checkout-sessions`) return `{ success, data }`. Server domains under `src/server/`: `ai/{chat,playground}`, `auth/`, `billing/`, `models/`, `ops/`.

```
TypeBox -> Elysia -> Eden Treaty -> handleElysia() -> React Query
```

Local-first DB: SQLocal over OPFS, one file per user. On open, migrations run forward-only, then `reconcileSchema` self-heals drifted tables, then `validateColumns` is a last-resort net that re-adds any missing column (force-rebuilding with backfilled defaults for required ones) so a stale browser DB never crashes at query time. RP/chat/tester entities live only in SQLocal; mutations write the local DB then `invalidateQueries`.

Guest mode runs the full feature set with no account (a server-side guest key backs catalog calls).

## Setup

```bash
bun install
bun dev
```

Prereqs: Bun, an upstream `new-api` gateway, Turso, an R2 bucket. `SESSION_SECRET` >= 32 chars and `SYSTEM_ACCESS_TOKEN` are required; Tavily and Creem are optional. Copy `.env.example` to `.env`.

## Scripts

| Script            | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `bun dev:log`     | Dev server (logs to `/tmp/next.log`)                      |
| `bun build`       | Production build                                          |
| `bun lint`        | ESLint                                                    |
| `bun prettier`    | Format                                                    |
| `bun openapi`     | Regen `src/openapi.ts` from upstream                      |
| `bun db:generate` | Drizzle migrations (server + client) + bundle for SQLocal |
| `bun db:reset`    | Wipe Turso + R2 prefixes (does NOT touch browser OPFS)    |
