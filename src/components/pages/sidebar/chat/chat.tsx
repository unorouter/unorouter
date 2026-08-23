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
    // The runtime lives in the (chat) layout and survives navigation to
    // /chat/presets and /chat/cards, so coming back mounts this on bare /chat
    // while a thread is still active. Skipping that first sync left the URL
    // without the convId, which read as the conversation being gone and forced
    // New Chat plus reselecting it. Restore the URL instead, and only skip when
    // the mount already agrees with the route.
    if (skipFirstSync.current) {
      skipFirstSync.current = false;
      if (!threadId || props.convId) return;
    }
    const url = threadId ? `/${locale}/chat/${threadId}` : `/${locale}/chat`;
    window.history.replaceState(null, "", url);
  }, [threadId, locale, props.convId]);

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
      <SectionBoundary>
        <Thread />
      </SectionBoundary>
    </div>
  );
}
