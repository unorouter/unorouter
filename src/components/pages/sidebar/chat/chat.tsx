"use client";

import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import { Thread } from "@/components/ui/assistant-ui/thread";
import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { useChatGate } from "@/hooks/ui/use-chat-gate";
import { APP_VALUES } from "@/lib/config/constants";
import { useAuiState } from "@assistant-ui/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import {
  ConversationStats,
  NeedsTokenGate,
  ZeroBalanceGate,
} from "./chat-elements";

type ChatProps = {
  convId?: string;
};

export function Chat(props: ChatProps) {
  const t = useTranslations();
  const locale = useLocale();
  const gate = useChatGate();
  const threadId = useAuiState((s) => s.threadListItem?.remoteId);
  const effectiveId = props.convId ?? threadId;
  const convQuery = useConversationQuery(effectiveId);
  const skipFirstSync = useRef(true);

  useEffect(() => {
    if (skipFirstSync.current) {
      skipFirstSync.current = false;
      return;
    }
    const url = threadId ? `/${locale}/chat/${threadId}` : `/${locale}/chat`;
    window.history.replaceState(null, "", url);
  }, [threadId, locale]);

  // Update document title since shallow history update skips generateMetadata
  useEffect(() => {
    const convTitle = convQuery.data?.title;
    document.title = convTitle
      ? t("CHAT.META.TITLE_WITH_NAME", { ...APP_VALUES, title: convTitle })
      : t("CHAT.META.TITLE", APP_VALUES);
  }, [convQuery.data?.title, t]);

  if (gate.needsToken) return <NeedsTokenGate />;
  if (gate.hasZeroBalance) return <ZeroBalanceGate />;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <ConversationStats convId={effectiveId} />
      <SectionBoundary>
        <Thread />
      </SectionBoundary>
    </div>
  );
}
