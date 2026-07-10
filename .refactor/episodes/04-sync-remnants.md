# Episode 04: Sync remnants (dead-system sweep)

## Intent (historical)

Turso mirror sync: 30-day server mirror of local-first data, push/pull bundles, R2 media rehydrate, cross-tab locks, pending-op outbox. Built May 17 - Jun 11, hardened intensely, then REMOVED Jun 11 (a24fea3d + translation/layout removals). Survivors deliberately kept: pending queue (logEnrich only), resource-lock (stream lock only), log-enrich, dormant syncExpiresAt columns + 18-table server schema for future re-add.

## Timeline

- May 17: "IDB-primary chat data with optional 30-day server sync" = birth.
- May 24-25: 25-commit hardening storm (backoff, FIFO, atomic sweep, patch-only mirror, cross-tab locks, chunk size).
- Jun 10-11: 20 more fixes (timestamps clobbering, remote deletions, R2 leaks, quota, enrollment/branching review findings) ENDING IN REMOVAL same day.
- Jun 11: outbox reduced to logEnrich task; sync-constants survive for literal unions.

## Debt markers

- Whole subsystem lived 25 days, consumed ~50 commits, died. Highest fix-density of any episode.
- Survivors are generic shapes serving one consumer: local_pending_tasks composite PK + taskType/kind columns for a single task type; queue.ts deliberately not generic (documented) but shape still is.
- syncExpiresAt on EVERY table (15 refs in shared.ts) + indexes, all dormant.
- validation/sync-constants.ts survives only for SyncKindName/RpSyncKind literal unions used by pending table + analytics.
- Risk: future readers assume sync exists (names say sync/) and build against ghosts.

## File set (verified)

- src/lib/db/client/sync/pending/queue.ts, sync/log-enrich.ts, sync/resource-lock.ts
- src/lib/db/schema/shared.ts (syncExpiresAt columns), schema/server.ts (mirror tables)
- src/lib/validation/sync-constants.ts
- src/hooks/ai/use-pending-drain-scheduler.ts

## Cleanup scope

1. DECIDE with owner first: is sync coming back? If no: drop dormant columns + server mirror tables via migration, rename sync/ folder to outbox/ or tasks/, collapse sync-constants into the pending table module. If yes: leave schema, still rename the client folder so live code stops advertising a dead system.
2. Either way: grep for any remaining imports from removed sync modules and any analytics events referencing sync kinds that can never fire.

## Non-goals

- No rebuilding sync. No generic task-queue engine (explicitly rejected in CLAUDE.md).
