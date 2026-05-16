"use client";

import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getLocalDb } from "./client";

// ---------------------------------------------------------------------------
// Non-blocking boot-time hydrator. Fires once after auth resolves. UI is NOT
// gated on this; it lands amendments into React Query via setQueryData as
// each bundle returns. Order doesn't matter — newest `updatedAt` wins.
//
// Stage 0: SSR already prefetched synced rows into HydrationBoundary.
// Stage 1: open SQLocal, run local SELECTs, write to React Query.
// Stage 2: GET /api/sync/state, pull stale bundles, upsert local, broadcast.
// ---------------------------------------------------------------------------

export function SyncStateHydrator() {
  const auth = useAuthQuery();
  const qc = useQueryClient();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!auth.data) return;
    fired.current = true;

    void hydrate(qc, auth.data.id).catch((err) => {
      logger.warn("Sync hydration failed", {
        context: "local-db.hydrator",
        error: String(err),
      });
    });
  }, [auth.data, qc]);

  return null;
}

async function hydrate(
  qc: ReturnType<typeof useQueryClient>,
  userId: number,
) {
  const local = await getLocalDb(userId);
  if (!local) return;

  // Stage 2 server reconciliation. The diff + per-bundle pull is wired in
  // Phase C alongside the hook rewrite. For now we expose just the
  // network call so the wiring is in place; the body fills in once the
  // per-kind query hooks land.
  const res = await rpc.api.sync.state.get();
  const state = handleElysia(res);

  qc.setQueryData(["sync-state"], state);
}
