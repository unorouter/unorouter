"use client";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  useRemoveSyncMutation,
  useSyncMutation,
  useSyncStateForRow,
} from "@/hooks/sync-hook";
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
  const state = useSyncStateForRow(props.kind, props.id);
  const syncMut = useSyncMutation();
  const removeMut = useRemoveSyncMutation();

  const isSynced = state.syncExpiresAt != null;
  const expiresAt =
    state.syncExpiresAt != null
      ? new Date(state.syncExpiresAt).toLocaleDateString(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  const onSync = () =>
    syncMut.mutate({
      kind: props.kind,
      id: props.id,
      payload: props.payload,
    });
  const onRemove = () => {
    if (!window.confirm(t("SYNC.CONFIRM_REMOVE"))) return;
    removeMut.mutate({ kind: props.kind, id: props.id });
  };

  if (!isSynced) {
    return (
      <div className="flex items-center gap-2">
        {props.compact ? null : (
          <Badge variant="outline" className="gap-1">
            <Icon name="cloud-off" className="size-3" />
            {t("SYNC.NOT_SYNCED")}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          disabled={syncMut.isPending}
        >
          <Icon name="cloud-upload" className="size-3.5" />
          {props.compact ? null : t("SYNC.ADD_SYNC")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="default" className="bg-success/15 text-success gap-1">
        <Icon name="cloud-upload" className="size-3" />
        {expiresAt
          ? t("SYNC.EXPIRES_AT", { date: expiresAt })
          : t("SYNC.SYNCED")}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onSync}
        disabled={syncMut.isPending}
        title={t("SYNC.RESYNC")}
      >
        <Icon name="refresh-ccw" className="size-3.5" />
        {props.compact ? null : t("SYNC.RESYNC")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={removeMut.isPending}
        title={t("SYNC.REMOVE_SYNC")}
        className="text-destructive"
      >
        <Icon name="cloud-off" className="size-3.5" />
        {props.compact ? null : t("SYNC.REMOVE_SYNC")}
      </Button>
    </div>
  );
}
