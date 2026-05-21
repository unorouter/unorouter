"use client";

import { ModelSelector } from "@/components/elements/model/model-selector";
import { Icon } from "@/components/ui/icon";
import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { formatPrice } from "@/lib/utils/format/number";
import { chatModelAtom } from "@/store/chat-store";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { Button } from "../../../ui/button";
import { ChatActionsMenu } from "./chat-actions-menu";

export function ChatControls() {
  const t = useTranslations();
  const [chatModel, setNewChatModel] = useAtom(chatModelAtom);
  const aui = useAui();

  const handleNewChat = () => {
    aui.threads().switchToNewThread();
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
      <div className="min-w-0 flex-1 sm:w-48 sm:flex-none lg:w-52">
        <ModelSelector value={chatModel} onChange={setNewChatModel} />
      </div>
      <Button
        size="sm"
        className="h-8 shrink-0 lg:px-3"
        onClick={handleNewChat}
        aria-label={t("CHAT.NEW_CONVERSATION")}
      >
        <Icon name="plus" className="h-3.5 w-3.5 lg:mr-1.5" />
        <span className="hidden lg:inline">{t("CHAT.NEW_CONVERSATION")}</span>
      </Button>
    </div>
  );
}

export function ConversationStats(props: { convId?: string }) {
  const t = useTranslations();
  const convQuery = useConversationQuery(props.convId);
  const data = convQuery.data;
  if (!props.convId || !data) return null;
  if (data.totalInputTokens <= 0 && data.totalOutputTokens <= 0) return null;
  return (
    <div className="text-muted-foreground pointer-events-none flex items-center justify-start gap-2 px-1 pb-1 text-[11px] tabular-nums">
      <span>
        {data.totalInputTokens.toLocaleString()} {t("CHAT.TOKENS_IN")}
      </span>
      <span>
        {data.totalOutputTokens.toLocaleString()} {t("CHAT.TOKENS_OUT")}
      </span>
      {data.totalCost > 0 && (
        <span className="text-foreground/70 font-medium">
          {formatPrice(data.totalCost)}
        </span>
      )}
    </div>
  );
}

export function ChatShareSlot() {
  const threadId = useAuiState((s) => s.threadListItem?.remoteId);
  return (
    <div className="flex items-center gap-1">
      <ChatActionsMenu convId={threadId ?? null} />
    </div>
  );
}

export function NeedsTokenGate() {
  const t = useTranslations();
  const token = useApiKey();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <Icon name="key" className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-foreground text-lg font-medium">
          {t("CHAT.GATE.NEEDS_TOKEN_TITLE")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("CHAT.GATE.NEEDS_TOKEN_DESC")}
        </p>
      </div>
      <Button
        size="sm"
        className="gap-1.5"
        onClick={token.createToken}
        disabled={token.isLoading}
      >
        {token.isLoading ? (
          <Icon name="loader" className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon name="plus" className="h-3.5 w-3.5" />
        )}
        {t("DOCS.GENERATE_API_KEY")}
      </Button>
    </div>
  );
}
