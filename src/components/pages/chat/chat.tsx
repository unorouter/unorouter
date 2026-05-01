"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { SectionBoundary } from "@/components/elements/section-boundary";
import { useConversationQuery } from "@/hooks/chat-hook";
import { useChatGate } from "@/hooks/ui/use-chat-gate";
import { APP_VALUES } from "@/lib/config/constants";
import { formatPrice } from "@/lib/utils/base";
import { useAuiState } from "@assistant-ui/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { NeedsTokenGate, ZeroBalanceGate } from "./chat-elements";

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
      {effectiveId &&
        convQuery.data &&
        (convQuery.data.totalInputTokens > 0 ||
          convQuery.data.totalOutputTokens > 0) && (
          <div className="text-muted-foreground pointer-events-none sticky top-12 z-10 hidden items-center justify-end gap-2 px-4 py-1 pr-6 text-[11px] tabular-nums md:flex">
            <span>
              {convQuery.data.totalInputTokens.toLocaleString()}{" "}
              {t("CHAT.TOKENS_IN")}
            </span>
            <span>
              {convQuery.data.totalOutputTokens.toLocaleString()}{" "}
              {t("CHAT.TOKENS_OUT")}
            </span>
            {convQuery.data.totalCost > 0 && (
              <span className="text-foreground/70 font-medium">
                {formatPrice(convQuery.data.totalCost)}
              </span>
            )}
          </div>
        )}
      <SectionBoundary>
        <Thread readOnly={props.readOnly} />
      </SectionBoundary>
    </div>
  );
}
