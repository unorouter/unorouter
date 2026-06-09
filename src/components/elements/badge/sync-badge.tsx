"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  useDrainPendingMutation,
  useRemoveSyncMutation,
  useSyncMutation,
  useSyncStateForRow,
} from "@/hooks/ai/sync-hook";
import { MAX_PENDING_ATTEMPTS } from "@/lib/db/client/sync/pending-sync";
import type { SyncKindName } from "@/lib/validation/sync";
import { useLocale, useTranslations } from "next-intl";

type Props = {
  kind: SyncKindName;
  id: string;
  payload?: unknown;
  compact?: boolean;
};

export function SyncBadge(props: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const auth = useAuthQuery();
  const state = useSyncStateForRow(props.kind, props.id);
  const syncMut = useSyncMutation();
  const removeMut = useRemoveSyncMutation();
  const drainMut = useDrainPendingMutation();

  if (!auth.data) return null;

  const isSynced = state.syncExpiresAt != null;
  const pending = state.pending;
  const isDead = pending != null && pending.attempts >= MAX_PENDING_ATTEMPTS;
  const isInFlight = pending != null && pending.attempts < MAX_PENDING_ATTEMPTS;
  const expiresAt =
    state.syncExpiresAt != null
      ? new Date(state.syncExpiresAt).toLocaleDateString(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;
  const pendingTooltip = pending?.lastError
    ? t("SYNC.PENDING_TOOLTIP", { error: pending.lastError })
    : undefined;

  const onSync = () =>
    syncMut.mutate({ kind: props.kind, id: props.id, payload: props.payload });
  const onRemove = async () => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.REMOVE_SYNC_TITLE"),
      description: t("SYNC.CONFIRM_REMOVE"),
      confirmLabel: t("SYNC.REMOVE_SYNC"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (ok) removeMut.mutate({ kind: props.kind, id: props.id });
  };
  const onRetryDead = () =>
    drainMut.mutate([{ kind: props.kind, id: props.id }]);

  // Priority: dead > in-flight > synced > not-synced.
  const pill = isDead ? (
    <Badge
      variant="default"
      className="bg-destructive/15 text-destructive gap-1"
    >
      <Icon name="triangle-alert" className="size-3" />
      {t("SYNC.SYNC_FAILED")}
    </Badge>
  ) : isInFlight ? (
    <Badge variant="default" className="bg-warning/15 text-warning gap-1">
      <Icon name="loader-2" className="size-3" />
      {t("SYNC.PENDING_RETRY", {
        n: pending!.attempts + 1,
        max: MAX_PENDING_ATTEMPTS,
      })}
    </Badge>
  ) : isSynced ? (
    <Badge variant="default" className="bg-success/15 text-success gap-1">
      <Icon name="cloud-upload" className="size-3" />
      {expiresAt ? t("SYNC.EXPIRES_AT", { date: expiresAt }) : t("SYNC.SYNCED")}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <Icon name="cloud-off" className="size-3" />
      {t("SYNC.NOT_SYNCED")}
    </Badge>
  );

  const statusPill = pendingTooltip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={pill} />
        <TooltipContent>{pendingTooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    pill
  );

  const showLabel = !props.compact;
  const actions = (
    <>
      {isDead && (
        <Button
          variant="ghost"
          size="xs"
          onClick={onRetryDead}
          disabled={drainMut.isPending}
          title={t("SYNC.RETRY_NOW")}
          className="text-destructive"
        >
          <Icon name="refresh-ccw" className="size-3.5" />
          {showLabel ? t("SYNC.RETRY_NOW") : null}
        </Button>
      )}
      {isSynced ? (
        <>
          <Button
            variant="ghost"
            size="xs"
            onClick={onSync}
            disabled={syncMut.isPending}
            title={t("SYNC.RESYNC")}
          >
            <Icon name="refresh-ccw" className="size-3.5" />
            {showLabel ? t("SYNC.RESYNC") : null}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={onRemove}
            disabled={removeMut.isPending}
            title={t("SYNC.REMOVE_SYNC")}
            className="text-destructive"
          >
            <Icon name="cloud-off" className="size-3.5" />
            {showLabel ? t("SYNC.REMOVE_SYNC") : null}
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="xs"
          onClick={onSync}
          disabled={syncMut.isPending}
          title={t("SYNC.ADD_SYNC")}
        >
          <Icon name="cloud-upload" className="size-3.5" />
          {showLabel ? t("SYNC.ADD_SYNC") : null}
        </Button>
      )}
    </>
  );

  return (
    <div className="flex items-center gap-2">
      {!props.compact && statusPill}
      {actions}
    </div>
  );
}
