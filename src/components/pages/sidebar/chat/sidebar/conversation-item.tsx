"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { useUpdateConversationMutation } from "@/hooks/chat-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";
import {
  useRemoveSyncMutation, useSyncMutation, useSyncStateForRow, } from "@/hooks/sync-hook";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
type ConversationItemProps = {
  conversation: {
    id: string;
    title: string | null;
    model: string | null;
    totalCost?: number;
    updatedAt: Date;
  };
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

export function ConversationItem(props: ConversationItemProps) {
  const t = useTranslations();
  const locale = useLocale();
  const pricingQuery = usePricingQuery();
  const updateMutation = useUpdateConversationMutation();
  const syncMut = useSyncMutation();
  const removeSyncMut = useRemoveSyncMutation();
  const syncState = useSyncStateForRow("conversations", props.conversation.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const modelData = pricingQuery.data?.models?.find(
    (m) => m.name === props.conversation.model,
  );
  const vendorName =
    typeof modelData?.vendor === "string"
      ? modelData.vendor
      : (modelData?.vendor?.name ?? "");

  const isSynced = syncState.syncExpiresAt != null;
  const syncExpiresLabel = syncState.syncExpiresAt
    ? new Date(syncState.syncExpiresAt).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
      })
    : null;

  function startEditing() {
    analytics.chat.conversationRenameStarted();
    setEditValue(props.conversation.title || "");
    setIsEditing(true);
    setMenuOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function saveEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== props.conversation.title) {
      updateMutation.mutate({
        id: props.conversation.id,
        body: { title: trimmed },
      });
    }
    setIsEditing(false);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={props.onSelect}
      onKeyDown={(e) => e.key === "Enter" && props.onSelect()}
      data-active={props.isSelected || undefined}
      className={cn(
        "group/conv flex min-h-12 cursor-pointer items-center gap-2 rounded-lg transition-colors",
        "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
        props.isSelected && "bg-muted",
      )}
    >
      {isEditing ? (
        <div
          className="flex h-full min-w-0 flex-1 items-center gap-1 px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") {
                analytics.chat.conversationRenameCancelled();
                setIsEditing(false);
              }
            }}
            className="bg-background border-border ring-ring min-w-0 flex-1 rounded border px-1.5 py-0.5 text-sm outline-none focus:ring-1"
          />
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-md"
            onClick={saveEdit}
          >
            <Icon name="check" className="size-3.5" />
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded-md"
            onClick={() => {
              analytics.chat.conversationRenameCancelled();
              setIsEditing(false);
            }}
          >
            <Icon name="x" className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-start text-sm">
          <span
            title={
              vendorName
                ? `${vendorName} · ${props.conversation.model ?? ""}`
                : (props.conversation.model ?? "")
            }
            className="shrink-0"
          >
            <VendorIcon
              vendor={vendorName}
              size={14}
              className="pointer-events-none"
            />
          </span>
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col transition-[padding]",
              (menuOpen || props.isSelected) && "pr-7",
              "group-hover/conv:pr-7",
            )}
          >
            <span
              className="truncate"
              title={props.conversation.title || t("CHAT.NEW_CONVERSATION")}
            >
              {props.conversation.title || t("CHAT.NEW_CONVERSATION")}
            </span>
            <span className="text-muted-foreground flex items-center gap-1 text-[10px] leading-none">
              {isSynced ? (
                <>
                  <Icon name="cloud-upload" className="size-2.5 text-emerald-500" />
                  {syncExpiresLabel
                    ? t("SYNC.EXPIRES_AT", { date: syncExpiresLabel })
                    : t("SYNC.SYNCED")}
                </>
              ) : (
                <>
                  <Icon name="cloud-off" className="size-2.5" />
                  {t("SYNC.NOT_SYNCED")}
                </>
              )}
            </span>
          </div>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
              <DropdownMenuItem onClick={startEditing} className="gap-2">
                <Icon name="pencil" className="size-4" />
                {t("CHAT.ACTION.RENAME")}
              </DropdownMenuItem>
              {!isSynced && (
                <DropdownMenuItem
                  disabled={syncMut.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    syncMut.mutate({
                      kind: "conversations",
                      id: props.conversation.id,
                    });
                    setMenuOpen(false);
                  }}
                  className="gap-2"
                >
                  <Icon name="cloud-upload" className="size-4" />
                  {t("SYNC.ADD_SYNC")}
                </DropdownMenuItem>
              )}
              {isSynced && (
                <>
                  <DropdownMenuItem
                    disabled={syncMut.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      syncMut.mutate({
                        kind: "conversations",
                        id: props.conversation.id,
                      });
                      setMenuOpen(false);
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
                      if (!window.confirm(t("SYNC.CONFIRM_REMOVE"))) return;
                      removeSyncMut.mutate({
                        kind: "conversations",
                        id: props.conversation.id,
                      });
                      setMenuOpen(false);
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
                  setMenuOpen(false);
                }}
                className="gap-2"
              >
                <Icon name="trash-2" className="size-4" />
                {t("CHAT.ACTION.DELETE")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
