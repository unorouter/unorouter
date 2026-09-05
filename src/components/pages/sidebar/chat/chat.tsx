"use client";

import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import { Thread } from "@/components/ui/assistant-ui/thread";
import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { useChatGate } from "@/hooks/ui/use-chat-gate";
import { APP_VALUES } from "@/lib/config/constants";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { useAuiState } from "@assistant-ui/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import {
  ActiveConfigBadge,
  CharacterBackground,
  NeedsTokenGate,
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
    // The runtime survives navigation, so a remount on bare /chat with a live thread
    // must restore the convId into the URL, not skip.
    if (skipFirstSync.current) {
      skipFirstSync.current = false;
      if (!threadId || props.convId) return;
    }
    const url = threadId ? `/${locale}/chat/${threadId}` : `/${locale}/chat`;
    window.history.replaceState(null, "", url);
  }, [threadId, locale, props.convId]);

  useEffect(() => {
    logChatDebug("chat.gate", { needsToken: gate.needsToken });
  }, [gate.needsToken]);

  useEffect(() => {
    const convTitle = convQuery.data?.title;
    document.title = convTitle
      ? t("CHAT.META.TITLE_WITH_NAME", { ...APP_VALUES, title: convTitle })
      : t("CHAT.META.TITLE", APP_VALUES);
  }, [convQuery.data?.title, t]);

  if (gate.needsToken)
    return (
      <div className="chat-shell-reveal flex min-h-0 flex-1 flex-col">
        <NeedsTokenGate />
      </div>
    );

  return (
    <div className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col">
      <CharacterBackground convId={effectiveId} />
      <ActiveConfigBadge />
      <SectionBoundary source="chat.thread">
        <Thread />
      </SectionBoundary>
    </div>
  );
}
