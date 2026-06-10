"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { useUpdateConversationMutation } from "@/hooks/ai/chat-hook";
import { useSyncStateForRow } from "@/hooks/ai/sync-hook";
import { useQueuedSends } from "@/lib/db/client/data/queued-send";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/utils/format/date";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ConversationItemEditor } from "./conversation-item-editor";
import { ConversationItemMenu } from "./conversation-item-menu";

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
  const auth = useAuthQuery();
  const isLoggedIn = !!auth.data;
  const pricingQuery = usePricingQuery();
  const updateMutation = useUpdateConversationMutation();
  const syncState = useSyncStateForRow("conversations", props.conversation.id);
  const queuedSends = useQueuedSends();
  const isQueued = queuedSends.data?.has(props.conversation.id) ?? false;
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const modelData = pricingQuery.data?.models?.find(
    (m) => m.name === props.conversation.model,
  );
  const vendorName =
    typeof modelData?.vendor === "string"
      ? modelData.vendor
      : (modelData?.vendor?.name ?? "");

  const isSynced = syncState.syncExpiresAt != null;
  const syncExpiresLabel = syncState.syncExpiresAt
    ? dayjs(syncState.syncExpiresAt).locale(locale).format("DD MMM")
    : null;

  function startEditing() {
    analytics.chat.conversationRenameStarted();
    setIsEditing(true);
    setMenuOpen(false);
  }

  function saveEdit(title: string) {
    if (title && title !== props.conversation.title) {
      updateMutation.mutate({
        id: props.conversation.id,
        body: { title },
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
        <ConversationItemEditor
          initialTitle={props.conversation.title || ""}
          onSave={saveEdit}
          onCancel={() => setIsEditing(false)}
        />
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
            {isQueued && (
              <span className="flex items-center gap-1 text-[10px] leading-none text-amber-700 dark:text-amber-400">
                <Icon name="clock" className="size-2.5" />
                {t("CHAT.QUEUED_PENDING")}
              </span>
            )}
            {isLoggedIn && (
              <span className="text-muted-foreground flex items-center gap-1 text-[10px] leading-none">
                {isSynced ? (
                  <>
                    <Icon
                      name="cloud-upload"
                      className="size-2.5 text-emerald-500"
                    />
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
            )}
          </div>
          <ConversationItemMenu
            conversationId={props.conversation.id}
            isSelected={props.isSelected}
            isLoggedIn={isLoggedIn}
            isSynced={isSynced}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            onRename={startEditing}
            onDelete={props.onDelete}
          />
        </div>
      )}
    </div>
  );
}
