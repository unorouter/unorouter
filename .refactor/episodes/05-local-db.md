# Episode 05: Local DB layer (SQLocal/OPFS)

## Intent

Per-user OPFS SQLite as sole source of truth. Forward-only migrations + three-stage self-heal (reconcileSchema 12-step rebuild, validateColumns, forceRebuildWithDefaults), recoverable-open retry loop, reconcileImport for foreign dumps.

## Timeline

- May 17-20: SQLocal adoption, esbuild worker bundling saga, transaction()-deadlock discovery (e289403a "drop local.transaction() in bundle writers - deadlocks worker"), LibSQL Studio embed, guest-migrate.
- May 25: OPFS cache eviction, partial-replay tolerance.
- Jun 10-11: guest-migrate REMOVED, connection split, outbox-through-salvage, ALTER-ADD ordering fix.
- Jun 16-19: error classification (contention vs corruption), sqlocal patch + retry-loop tuning, schema reconciliation refinement, releaseOnUnload patch later deleted after measurement.
- Jun 30 - Jul 1: drifted-state error handling, newSql factory, streaming download saga (implement streaming -> enhance -> enhance -> REPLACE with direct blob downloads, 5 commits in 1 day).
- Repeated "add initial schema for card and conversation management" commits (May 17, 18, 19, 22, 25, Jun 29, 30) = drizzle regen noise mixed with real schema work.

## Debt markers

- Jul 1 streaming-download dead end: 4 commits building streaming, 1 replacing it with blobs. Check for orphaned streaming helpers/probe code.
- Self-heal machinery is 3 overlapping layers accreted from separate incidents; each layer documented but interaction complexity is high.
- No transaction rule enforced only by convention + CLAUDE.md; nothing stops a new sql.transaction() call.
- Migration journal noise: schema-regen commits with identical subjects make history archaeology hard here.

## File set

- src/lib/db/client/ (client.ts, new-sql.ts, schema-migrate/, data-migrate/reconcile-import.ts)
- src/lib/db/schema/
- src/components/elements/db/local-db-studio.tsx
- drizzle/client/ + bundle-migrations.ts

## Cleanup scope

1. Sweep Jul 1 download saga leftovers (streaming/probe helpers with no callers).
2. Add an eslint restriction (no-restricted-syntax) for sql.transaction() in client DB code, turning the convention into a check.
3. Consider folding the three self-heal layers docs into one module-level comment block so the next incident patch does not add a fourth blind layer.

## Non-goals

- No storage-engine swap, no touching retry timings (sized to measured iOS release lag).
