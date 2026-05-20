import { confirm } from "@/components/ui/confirm";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  useRemoveSyncMutation,
  useSyncMutation,
  useSyncStateForRow,
} from "@/hooks/ai/sync-hook";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";

type Props = {
  convId: string | null;
  isLoggedIn: boolean;
};

export function SyncMenuItems(props: Props) {
  const t = useTranslations();
  const syncMut = useSyncMutation();
  const removeSyncMut = useRemoveSyncMutation();
  const syncState = useSyncStateForRow("conversations", props.convId ?? "");

  const isSynced = syncState.syncExpiresAt != null;
  const syncExpiresLabel = syncState.syncExpiresAt
    ? dayjs(syncState.syncExpiresAt).format("MMM D, YYYY")
    : null;

  const handleAddSync = () => {
    if (!props.convId) return;
    syncMut.mutate({ kind: "conversations", id: props.convId });
  };

  const handleRemoveSync = async () => {
    if (!props.convId) return;
    const ok = await confirm({
      title: t("COMMON.CONFIRM.REMOVE_SYNC_TITLE"),
      description: t("SYNC.CONFIRM_REMOVE"),
      confirmLabel: t("SYNC.REMOVE_SYNC"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    removeSyncMut.mutate({ kind: "conversations", id: props.convId });
  };

  if (!props.isLoggedIn || !props.convId) return null;

  if (!isSynced) {
    return (
      <>
        <DropdownMenuItem onClick={handleAddSync} disabled={syncMut.isPending}>
          <Icon name="cloud-upload" className="size-4" />
          {t("SYNC.ADD_SYNC")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </>
    );
  }

  return (
    <>
      <DropdownMenuItem onClick={handleAddSync} disabled={syncMut.isPending}>
        <Icon name="refresh-ccw" className="size-4" />
        {syncExpiresLabel
          ? t("SYNC.RESYNC_EXPIRES", { date: syncExpiresLabel })
          : t("SYNC.RESYNC")}
      </DropdownMenuItem>
      <DropdownMenuItem
        variant="destructive"
        onClick={handleRemoveSync}
        disabled={removeSyncMut.isPending}
      >
        <Icon name="cloud-off" className="size-4" />
        {t("SYNC.REMOVE_SYNC")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
