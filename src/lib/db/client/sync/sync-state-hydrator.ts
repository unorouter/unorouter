"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { logger } from "@/lib/utils/logger";
import type { SyncKindName } from "@/lib/validation/sync-constants";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { getLocalDb } from "../client";
import { migrateGuestLocalDb } from "../data-migrate/guest-migrate";
import { stage1LocalSeed } from "./local-seed";
import {
  drainPending,
  retryPendingTargets,
  type DrainResult,
} from "./pending-sync";
import { reconcileKinds, stage2ServerReconcile } from "./reconcile";
import { usePendingDrainScheduler } from "./scheduler";

// Skip conv bundle pull on conv pages (SSR already covered); rest reconciles in idle callback.
const CONV_ROUTE_RE = /^\/[^/]+\/chat\/[^/]+\/?$/;

// Module-scoped fire-once gate shared across chat/playground layouts (avoid Stage 2 refire on nav).
// Tracks latest userId only so identity switch re-hydrates fresh.
let lastFiredUserId: number | null = null;

// Narrowed translator type: next-intl's `Translator` triggers TS2589 when the
// hydrator passes arbitrary string keys at runtime, so accept the minimal call shape.
type TFn = (key: string, values?: Record<string, string | number>) => string;

export function SyncStateHydrator() {
  const auth = useAuthQuery();
  const qc = useQueryClient();
  const t = useTranslations();
  const pathname = usePathname();

  usePendingDrainScheduler(auth.data?.id ?? null);
  // Queued offline sends replay for guests too (they stream via the guest key).

  useEffect(() => {
    const userId = auth.data?.id ?? GUEST_USER_ID;
    if (lastFiredUserId === userId) return;
    lastFiredUserId = userId;

    const onConvRoute = CONV_ROUTE_RE.test(pathname ?? "");
    const excludeKinds: SyncKindName[] = onConvRoute ? ["conversations"] : [];

    // Cast once at boundary: next-intl typed-key inference is too strict for
    // our runtime-keyed `t("SYNC.LOCAL_NEWER_PRESERVED", {count})` pattern.
    const tFn = t as unknown as TFn;
    void hydrate(qc, userId, tFn, excludeKinds)
      .catch((err) => {
        logger.warn("Sync hydration failed", {
          context: "local-db.hydrator",
          error: String(err),
        });
      })
      .then(() => {
        if (userId > GUEST_USER_ID && excludeKinds.length > 0) {
          scheduleCatchUp(qc, userId, tFn);
        }
      });
  }, [auth.data, qc, t, pathname]);

  return null;
}

async function hydrate(
  qc: QueryClient,
  userId: number,
  t: TFn,
  excludeKinds: SyncKindName[] = [],
) {
  const local = await getLocalDb(userId);
  if (!local) return;

  // Stage 0: fold guest rows into the user DB (idempotent single-flight, only
  // call site) so stage 1 never seeds the query cache from a pre-copy DB.
  if (userId > GUEST_USER_ID) await migrateGuestLocalDb(userId);

  await stage1LocalSeed(qc, userId);
  if (userId > GUEST_USER_ID) {
    const reconcile = await stage2ServerReconcile(qc, userId, excludeKinds);
    const result = await drainPending(userId);
    qc.invalidateQueries({ queryKey: queryKeys.pendingSync() });
    if (result.dead.length > 0) {
      surfaceDeadLetterToast(qc, userId, result, t);
    }
    showLocalNewerToast(t, reconcile.skippedLocalNewer);
  }
}

function showLocalNewerToast(t: TFn, count: number) {
  if (count > 0) {
    toast.info(t("SYNC.LOCAL_NEWER_PRESERVED", { count }), { duration: 6000 });
  }
}

function scheduleCatchUp(qc: QueryClient, userId: number, t: TFn) {
  const runCatchUp = () => {
    void reconcileKinds(qc, userId, ["conversations"])
      .then((r) => showLocalNewerToast(t, r.skippedLocalNewer))
      .catch((err) => {
        logger.warn("Sync catch-up failed", {
          context: "local-db.hydrator",
          error: String(err),
        });
      });
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(runCatchUp, { timeout: 5000 });
  } else {
    setTimeout(runCatchUp, 5000);
  }
}

function surfaceDeadLetterToast(
  qc: QueryClient,
  userId: number,
  result: DrainResult,
  t: TFn,
) {
  const counts: Record<string, number> = {};
  for (const d of result.dead) counts[d.kind] = (counts[d.kind] ?? 0) + 1;
  const label = Object.entries(counts)
    .map(([kind, n]) => t("SYNC.DLQ_KIND_COUNT", { kind, count: n }))
    .join(", ");
  toast.error(t("SYNC.DLQ_TOAST", { items: label }), {
    duration: 10_000,
    action: {
      label: t("SYNC.DLQ_RETRY"),
      onClick: async () => {
        const retry = await retryPendingTargets(userId, qc, result.dead);
        if (retry.dead.length === 0) {
          toast.success(t("SYNC.DLQ_RETRY_SUCCESS"));
        } else {
          toast.error(t("SYNC.DLQ_RETRY_FAILED"));
        }
      },
    },
  });
}
