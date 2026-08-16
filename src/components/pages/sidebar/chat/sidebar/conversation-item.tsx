"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { useUpdateConversationMutation } from "@/hooks/ai/chat-hook";
import { useCustomProvidersQuery } from "@/hooks/ai/custom-providers-hook";
import { useQueuedSends } from "@/hooks/ai/use-queued-sends";
import { usePricingCatalogQuery } from "@/hooks/models/pricing-hook";
import {
  isCustomModelId,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
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
  const pricingQuery = usePricingCatalogQuery();
  const updateMutation = useUpdateConversationMutation();
  const queuedSends = useQueuedSends();
  const isQueued = queuedSends.data?.has(props.conversation.id) ?? false;
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const customProvidersQuery = useCustomProvidersQuery();
  const model = props.conversation.model;
  const isCustom = isCustomModelId(model);

  const modelData = pricingQuery.data?.models.find((m) => m.model_name === model);
  const vendorName = modelData?.vendor ?? "";
  const isUnknownCatalog =
    !isCustom && !!model && pricingQuery.isSuccess && !modelData;

  const customParsed = isCustom && model ? parseCustomModelId(model) : null;
  const customProvider = customParsed
    ? customProvidersQuery.data?.find((p) => p.id === customParsed.providerId)
    : undefined;
  const customLabel = customParsed
    ? (customProvider?.models.find((m) => m.key === customParsed.modelKey)
        ?.label ?? customParsed.modelKey)
    : "";
  const customTooltip = customProvider
    ? `${customProvider.name} / ${customLabel}`
    : customLabel;

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
          {isCustom ? (
            <span
              title={customTooltip}
              className="text-muted-foreground shrink-0"
            >
              <Icon name="server" className="pointer-events-none size-3.5" />
            </span>
          ) : isUnknownCatalog ? (
            <span
              title={t("CHAT.MODEL.UNAVAILABLE_TOOLTIP", {
                model: model ?? "",
              })}
              className="text-muted-foreground shrink-0"
            >
              <Icon
                name="circle-help"
                className="pointer-events-none size-3.5"
              />
            </span>
          ) : (
            <span
              title={
                vendorName ? `${vendorName} · ${model ?? ""}` : (model ?? "")
              }
              className="shrink-0"
            >
              <VendorIcon
                vendor={vendorName}
                size={14}
                className="pointer-events-none"
              />
            </span>
          )}
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
          </div>
          <ConversationItemMenu
            conversationId={props.conversation.id}
            isSelected={props.isSelected}
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
