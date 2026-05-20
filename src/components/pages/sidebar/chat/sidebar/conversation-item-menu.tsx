"use client";

import { confirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  useRemoveSyncMutation,
  useSyncMutation,
} from "@/hooks/ai/sync-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Row actions dropdown: rename, sync/resync, remove-sync, delete.
// Owns the sync mutations since nothing else in the row triggers them.
export function ConversationItemMenu(props: {
  conversationId: string;
  isSelected: boolean;
  isLoggedIn: boolean;
  isSynced: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations();
  const syncMut = useSyncMutation();
  const removeSyncMut = useRemoveSyncMutation();

  const runSync = () => {
    syncMut.mutate({ kind: "conversations", id: props.conversationId });
    props.onOpenChange(false);
  };

  const runRemoveSync = async () => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.REMOVE_SYNC_TITLE"),
      description: t("SYNC.CONFIRM_REMOVE"),
      confirmLabel: t("SYNC.REMOVE_SYNC"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    removeSyncMut.mutate({ kind: "conversations", id: props.conversationId });
    props.onOpenChange(false);
  };

  return (
    <DropdownMenu open={props.open} onOpenChange={props.onOpenChange}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute right-1 flex size-7 shrink-0 items-center justify-center rounded-md p-0 transition-opacity",
          "opacity-0 group-hover/conv:opacity-100",
          "data-[state=open]:bg-accent data-[state=open]:opacity-100",
          props.isSelected && "opacity-100",
        )}
      >
        <Icon name="ellipsis" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={props.onRename} className="gap-2">
          <Icon name="pencil" className="size-4" />
          {t("CHAT.ACTION.RENAME")}
        </DropdownMenuItem>
        {props.isLoggedIn && !props.isSynced && (
          <DropdownMenuItem
            disabled={syncMut.isPending}
            onClick={(e) => {
              e.stopPropagation();
              runSync();
            }}
            className="gap-2"
          >
            <Icon name="cloud-upload" className="size-4" />
            {t("SYNC.ADD_SYNC")}
          </DropdownMenuItem>
        )}
        {props.isLoggedIn && props.isSynced && (
          <>
            <DropdownMenuItem
              disabled={syncMut.isPending}
              onClick={(e) => {
                e.stopPropagation();
                runSync();
              }}
              className="gap-2"
            >
              <Icon name="refresh-ccw" className="size-4" />
              {t("SYNC.RESYNC")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={removeSyncMut.isPending}
              onClick={(e) => {
                e.stopPropagation();
                void runRemoveSync();
              }}
              className="gap-2"
            >
              <Icon name="cloud-off" className="size-4" />
              {t("SYNC.REMOVE_SYNC")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete();
            props.onOpenChange(false);
          }}
          className="gap-2"
        >
          <Icon name="trash-2" className="size-4" />
          {t("CHAT.ACTION.DELETE")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
