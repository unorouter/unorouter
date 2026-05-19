"use client";

import { Thread } from "@/components/ui/assistant-ui/thread";
import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import { useConversationQuery } from "@/hooks/chat-hook";
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
  readOnly?: boolean;
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
    if (props.readOnly) return;
    if (skipFirstSync.current) {
      skipFirstSync.current = false;
      return;
    }
    const url = threadId ? `/${locale}/chat/${threadId}` : `/${locale}/chat`;
    window.history.replaceState(null, "", url);
  }, [props.readOnly, threadId, locale]);

  // Update document title since shallow history update skips generateMetadata
  useEffect(() => {
    if (props.readOnly) return;
    const convTitle = convQuery.data?.title;
    document.title = convTitle
      ? t("CHAT.META.TITLE_WITH_NAME", { ...APP_VALUES, title: convTitle })
      : t("CHAT.META.TITLE", APP_VALUES);
  }, [props.readOnly, convQuery.data?.title, t]);

  if (!props.readOnly && gate.needsToken) return <NeedsTokenGate />;
  if (!props.readOnly && gate.hasZeroBalance) return <ZeroBalanceGate />;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <ConversationStats convId={effectiveId} />
      <SectionBoundary>
        <Thread readOnly={props.readOnly} />
      </SectionBoundary>
    </div>
  );
}
