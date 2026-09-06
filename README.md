# UnoRouter

Local-first frontend for the UnoRouter AI gateway (`new-api` fork, 130+ upstream providers). Next.js 16 + Elysia BFF on Bun. AGPL-3.0.

Surfaces:

- **Gateway dashboard**: API keys, usage logs, billing, credits, gift cards, affiliate, model catalog, price comparison, status page.
- **Chat**: RisuAI-class roleplay client. Catalog models through a same-origin proxy (the upstream token never reaches the browser) or bring your own OpenAI-compatible endpoint (browser talks to it directly). Characters, lorebooks, presets, loadouts, Lua triggers, sandboxed JS plugins, group chats, peer-to-peer rooms, in-chat image generation, SillyTavern card import.
- **AI API Model Tester**: probes an endpoint with nonce-tagged prompts to tell whether it serves the model it claims; public rankings leaderboard with server-issued (unforgeable) probe mode.

Chat and tester state live in ONE SQLocal/OPFS database per device in the browser; that copy is the only copy. Everything works for guests and offline. Cross-device transfer is export/import. The server DB (Turso/libSQL) holds only the public rankings.

## Stack

Next.js 16, React 19 compiler, Tailwind v4, shadcn/ui, Jotai, React Query 5, nuqs, next-intl (18 locales). Elysia, TypeBox, Eden Treaty, Orval-generated upstream client. Drizzle over SQLocal (opfs-sahpool) and libSQL. Vercel AI SDK, assistant-ui, wasmoon, Runware, Tavily. Serwist service worker. PostHog, Pino.

## Layout

```
src/app/[locale]/(auth|chat|docs|image|navbar|room|sidebar|status)   route groups
src/server/{ai,auth,billing,models,ops}                               BFF domains: route.ts -> *.service.ts
src/lib/ai/chat                                                       isomorphic chat engine (runs in the browser)
src/lib/db/{client,server,schema}                                     SQLocal + libSQL, shared schema
public/i18n                                                           18 locale files
k8s/                                                                  ArgoCD-managed deployment
```

## Develop

```bash
cp .env.example .env    # SYSTEM_ACCESS_TOKEN and SESSION_SECRET (>= 32 chars) are required; Turso, Tavily, Runware optional
bun install
bun dev:log             # dev server, logs to /tmp/next.log
bun typecheck && bun lint
bun openapi             # regenerate src/openapi.ts from the upstream spec
bun db:generate         # Drizzle migrations for both DBs, bundled for SQLocal
```

Deploy: a push to `main` builds the image (GHCR) and ArgoCD rolls it. Rules and traps are in `CLAUDE.md`.
