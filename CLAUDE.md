Next.js 16 storefront. React 19, Tailwind v4, shadcn/ui, Elysia backend, Turso DB.

## Commands

```bash
bun dev:log          # dev server (logs to /tmp/next.log)
bun build            # production build
bun lint             # eslint
bun openapi          # regenerate openapi.ts from upstream spec
bun db:generate      # drizzle-kit generate migration
```

NEVER start/restart/kill the dev server. Read `/tmp/next.log` for errors. Use browser MCP to inspect.

## Architecture

- **Backend:** Elysia on `src/app/api/[[...route]]/route.ts`, Eden Treaty RPC for type safety
- **State:** Jotai (UI, cookie-backed) + React Query (server data, cache updates via `setQueryData`)
- **Validation:** TypeBox with compiled checkers, `safeParse()` helper in `src/lib/validation/helpers.ts`
- **DB:** Turso/SQLite via Drizzle ORM, schema in `src/lib/db/schema.ts`
- **i18n:** next-intl, locales en/de in `public/i18n/`
- **Media:** Cloudflare R2 via AWS SDK
- **Search:** Orama (client-side, index built at build time)
- **Logging:** Pino wrapper (`src/lib/utils/logger.ts`), always include `context` field
- `openapi.ts` is Orval auto-generated. Never edit. Regenerate with `bun openapi`

## Rules

- **No prop destructuring** in function signatures. Use `props.field`
- **Full translation keys** with UPPER_SNAKE nesting: `t("BILLING.CURRENT_BALANCE")`. Use `msg()` for non-React code
- **Real translations** in ALL locale files. Never English placeholders for German
- **Query keys** from `src/lib/react-query/keys.ts` only. Never raw string arrays
- **Cache updates** via `setQueryData` + pure helpers in `src/lib/react-query/conv-cache.ts`. Avoid `invalidateQueries`/`refetch`
- **No useMemo/useCallback** (React 19)
- **No dashes as punctuation** (m dashes, n dashes, `--`). Rephrase instead
- **Named exports** for components, `"use client"` for client components
- **Kebab-case** file names. Suffixes: `*.service.ts`, `route.ts`, `*-hook.ts`, `*-store.ts`

## Key Patterns

**Elysia routes** in `src/server/<feature>/route.ts`, logic in `*.service.ts`. Always return `{ success: true, data }`. Validation via TypeBox schemas in `src/lib/validation/`.

**Mutations** use `handleElysia()` to unwrap responses, `handleError(e, t)` in `onError` for i18n toasts. Optimistic updates use `onMutate` with snapshot + rollback. See `src/hooks/chat-hook.ts` for reference.

**Jotai atoms** use `atomWithStorage` + `jotaiCookieStorage` for persistence. Derived atoms via `atom(getter, setter)`. Sync access for non-React code (stream callbacks) via plain module variables with version counters in `src/store/chat-store.ts`.

**Server pages** prefetch with `getQueryClient()` + `HydrationBoundary`/`dehydrate()`.

## Type Safety Pipeline

```
TypeBox schema → Elysia validation → Eden Treaty RPC → handleElysia() → React Query hook
```

- `handleElysia()` / `unwrap()` in `src/lib/utils/base.ts`
- `handleError()` in `src/lib/utils/client.ts`
- Eden type helpers (`EdenArgs`, `EdenResponse`, `EdenQuery`) in `src/lib/types/eden.ts`
