# UnoRouter

Local-first AI chat + image/video generation. Next.js 16 frontend, Elysia BFF in front of upstream `new-api`. Per-user SQLocal/OPFS DB is source of truth; optional Turso mirror syncs across devices.

## Stack

- Next.js 16, React 19, Tailwind v4, shadcn/ui
- Jotai, React Query 5, next-intl (8 locales)
- Elysia on Bun, TypeBox, Eden Treaty, Orval-generated upstream client
- Drizzle ORM: SQLocal (client) + Turso/libSQL (server)
- Vercel AI SDK, Tavily web search, Creem moderation
- Cloudflare R2 with SSRF-safe undici fetch
- PostHog, Pino, Orama, Satori

## Architecture

BFF in front of `new-api`. Pass-through routes (`auth`, most `billing`, `models`, `ops/logs`, `ops/stats`) return `unwrap(res)`. Local-logic routes (`ai/chat`, `ai/playground`, `ai/sync`, `billing/checkout-sessions`) return `{ success, data }`.

Server domains under `src/server/`: `ai/{chat,playground,sync}`, `auth/`, `billing/`, `models/`, `ops/`.

Local-first sync: client writes SQLocal first; rows with `syncExpiresAt != null` mirror to Turso via `/api/ai/sync/:kind/:id`. Failed pushes retry up to 5x via `local_pending_sync`.

```
TypeBox -> Elysia -> Eden Treaty -> handleElysia() -> React Query
```

## Features

- Streaming chat with branch editing, tool calls, file/image/task items
- RP entities (characters/personas/lorebooks/presets/cards), SillyTavern card v2/v3 import
- Image+video playground: SDXL, Flux 2, FLUX Kontext, GPT Image, Gemini. Img2Img/Upscale/ADetailer/Inpaint
- Async video task polling + R2 rehosting
- Tavily web search (paid gate)
- Conv export/import: native, orpg, SillyTavern JSONL
- Guest mode (full feature set, no account)
- ACP checkout (Stripe/Creem) with Idempotency-Key
- Affiliate badges (Satori SVG/PNG, 8 templates)
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
| `bun lh`          | Lighthouse                                                |
