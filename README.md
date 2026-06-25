# UnoRouter

Local-first AI chat + image/video generation. Next.js 16 frontend, Elysia BFF in front of upstream `new-api`. A per-user SQLocal/OPFS browser DB is the sole source of truth for chat/playground/RP state; cross-device transfer is local export/import (the Turso mirror sync was removed, the server schema stays for re-adding it later).

## Stack

- Next.js 16, React 19, Tailwind v4, shadcn/ui
- Jotai, React Query 5, next-intl (18 locales)
- Elysia on Bun, TypeBox, Eden Treaty, Orval-generated upstream client
- Drizzle ORM: SQLocal (client) + Turso/libSQL (server)
- Vercel AI SDK, Tavily web search, Creem moderation
- Cloudflare R2 with SSRF-safe undici fetch
- PostHog, Pino, Orama, Satori

## Architecture

BFF in front of `new-api`. Pass-through routes (`auth`, most `billing`, `models`, `ops/logs`, `ops/stats`) return `unwrap(res)`. Local-logic routes (`ai/chat`, `ai/playground`, `billing/checkout-sessions`) return `{ success, data }`.

Server domains under `src/server/`: `ai/{chat,playground}`, `auth/`, `billing/`, `models/`, `ops/`.

The text chat engine is isomorphic and runs in the browser for both paths. DEFAULT (catalog model): the browser assembles the request then `streamText` points at a same-origin proxy (`/api/ai/chat/forward/chat/completions`) that injects the upstream token server-side and raw-pipes the SSE. CUSTOM (bring-your-own provider, BYOK): 100% client-side, the browser streams directly to the user's own endpoint with the user's own token. RP entities + conversations live only in SQLocal; mutations write the local DB then `invalidateQueries`.

```
TypeBox -> Elysia -> Eden Treaty -> handleElysia() -> React Query
```

## Features

- Streaming chat with branch editing, tool calls, file/image/task items
- Bring-your-own provider (BYOK): paste any OpenAI-compatible endpoint + key, pick models, stream straight from the browser. Token never touches the server. Per-model tokenizers
- RP entities (characters/personas/lorebooks/presets/cards), SillyTavern card v2/v3 import, duplicate across all entity types
- RisuAI-style prompt assembly: orderable prompt template, single-pool lorebooks with `@@decorators`, CBS macros, regex scripts, Lua triggers (wasmoon), multi-character group rotation, rolling-summary memory + semantic retrieval
- Image+video playground: SDXL, Flux 2, FLUX Kontext, GPT Image, Gemini. Img2Img/Upscale/ADetailer/Inpaint
- Async video task polling + R2 rehosting
- Tavily web search (paid gate)
- Conv export/import: native, orpg, SillyTavern JSONL. Local DB Studio (OPFS inspector + import)
- Guest mode (full feature set, no account)
- ACP checkout (Stripe/Creem) with Idempotency-Key
- Affiliate badges (Satori SVG/PNG, 9 templates)
- Agent discovery: `.well-known/{agent-card,acp,mcp,oauth,ucp,...}`, Web Bot Auth, WebMCP

## Setup

```bash
bun install
bun dev
```

Prereqs: Bun, upstream `new-api`, Turso, R2 bucket. `SESSION_SECRET` >= 32 chars, `SYSTEM_ACCESS_TOKEN` required. Tavily optional.

Copy `.env.example` to `.env`.

## Scripts

| Script            | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `bun dev:log`     | Dev server (logs to `/tmp/next.log`)                      |
| `bun build`       | Production build                                          |
| `bun lint`        | ESLint                                                    |
| `bun prettier`    | Format                                                    |
| `bun openapi`     | Regen `src/openapi.ts` from upstream                      |
| `bun db:generate` | Drizzle migrations (server + client) + bundle for SQLocal |
| `bun db:reset`    | Wipe Turso + R2 prefixes                                  |
