"use client";

import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import { ProviderConsentPanel } from "@/components/elements/model/provider-consent-panel";
import { Thread } from "@/components/ui/assistant-ui/thread";
import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { usePricingCatalogQuery } from "@/hooks/models/pricing-hook";
import { useChatGate } from "@/hooks/ui/use-chat-gate";
import { APP_VALUES } from "@/lib/config/constants";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { chooseChatModelAtom } from "@/store/chat-store";
import { useAuiState } from "@assistant-ui/react";
import { useSetAtom } from "jotai";
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

// /chat?model=<id> preselects a model, so a shared link (or the gateway's
// consent error) lands on the right one. Unknown ids are ignored.
function useModelFromUrl() {
  const setChatModel = useSetAtom(chooseChatModelAtom);
  const catalog = usePricingCatalogQuery().data?.models;
  useEffect(() => {
    if (!catalog) return;
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("model");
    if (!requested) return;
    if (catalog.some((m) => m.model_name === requested))
      setChatModel(requested);
    url.searchParams.delete("model");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [catalog, setChatModel]);
}

export function Chat(props: ChatProps) {
  const t = useTranslations();
  const locale = useLocale();
  const gate = useChatGate();
  useModelFromUrl();
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

  if (gate.business)
    return (
      <div className="chat-shell-reveal flex min-h-0 flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground text-center text-sm">
          {t("FREE_CONSENT.BUSINESS")}
        </p>
      </div>
    );

  if (gate.needsConsent && gate.selectedModel)
    return (
      <div className="chat-shell-reveal flex min-h-0 flex-1 flex-col">
        <ProviderConsentPanel model={gate.selectedModel} />
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
