# UnoRouter

Full-featured AI chat application with a Next.js frontend and an Elysia BFF in front of an upstream `new-api` service. Chat state (conversations, messages, shared links) lives in a local Turso/SQLite database; everything else is a typed pass-through to the upstream backend.

## Tech Stack

**Frontend**

- Next.js 16 (React 19), TypeScript, Tailwind CSS v4, shadcn/ui
- Jotai (client state), React Query 5 (server state)
- next-intl (8 locales: en, de, fr, ja, ru, vi, zh-CN, zh-TW)
- Vercel AI SDK for streaming, assistant-ui for chat components

**BFF**

- Elysia 1.4 on Bun runtime
- TypeBox validation, Eden Treaty RPC
- Orval-generated OpenAPI client (`src/openapi.ts`) for upstream calls

**Database**

- Turso/libSQL (serverless SQLite) via Drizzle ORM
- Auto-migrates on first `getDb()` call

**AI and Search**

- Vercel AI SDK (`ai`) with OpenAI-compatible providers
- Tavily API for real-time web search augmentation

**Infrastructure**

- Cloudflare R2 for media storage (AWS SDK S3-compatible)
- PostHog for analytics (server + client)
- Pino for structured logging
- Docker multi-stage build, Traefik reverse proxy
- Orama full-text search (index pregenerated at build time)

## Architecture

UnoRouter is a **BFF (backend-for-frontend)**, not a full ledger backend. The Elysia layer at `src/app/api/[[...route]]/route.ts` mounts all feature routes and adds request ID tracking, timing, and error taxonomy at the boundary.

Two distinct verticals:

- **Pass-through verticals** (`auth`, `billing`, `token`, `affiliate`, `logs`, `pricing`, `dashboard`, `stats`, `settings`): thin typed forwarders to upstream `new-api` via the Orval client. Route handlers call `unwrap(res)` and return the upstream shape directly.
- **Chat vertical** (`src/server/chat/`): owns local DB writes, streaming logic, media uploads, title generation, web search, and async video task polling. Route handlers return `{ success: true, data }` so `handleElysia()` on the client can distinguish typed failures.

Type pipeline:

```
TypeBox schema → Elysia validation → Eden Treaty RPC → handleElysia() → React Query hook
```

## Features

- Real-time streaming chat (Vercel AI SDK, SSE)
- Conversation management: create, archive, star, delete, paginate
- Shared conversations via secure `shareId`
- Auto-title generation using the cheapest available text model
- Web search augmentation via Tavily (automatic query classification)
- Media uploads to Cloudflare R2 with MIME/size validation
- Async video task polling
- Guest mode (localStorage-backed conversation IDs, `GUEST_API_KEY` fallback)
- Billing, subscriptions, and top-up management (pass-through)
- API token CRUD with search and pagination
- Usage logs and statistics with charts (Recharts)
- Affiliate tracking
- Fumadocs-based documentation site (openclaw, codex, gemini-cli, claude-code, cc-switch)
- Dynamic OG image generation (Satori)
- SEO: IndexNow submission, pregenerated timestamps, Orama search index

## Getting Started

### Prerequisites

- Bun 1.x
- Turso database (or local libSQL)
- Cloudflare R2 bucket
- Tavily API key (optional; web search skips gracefully if absent)

### Environment Variables

Copy `.env.example` to `.env` and fill in the values. See the example file for all keys.

### Development

```bash
bun install
bun dev
```

## Key Scripts

| Script            | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `bun dev:log`     | Start dev server (logs to `/tmp/next.log`)                     |
| `bun build`       | Production build (runs prebuild first)                         |
| `bun lint`        | ESLint                                                         |
| `bun openapi`     | Regenerate `src/openapi.ts` from upstream OpenAPI spec (Orval) |
| `bun db:generate` | Generate Drizzle migration                                     |
| `bun db:reset`    | Reset local chat DB                                            |
| `bun lh`          | Run Lighthouse audits                                          |
