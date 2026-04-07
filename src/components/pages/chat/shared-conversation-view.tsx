"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { mapRawMessages } from "@/components/pages/chat/utils/chat-utils";
import { useSharedConversationQuery } from "@/hooks/chat-hook";
import { SharedConvIdProvider } from "@/hooks/ui/use-chat-hook";
import { queryKeys } from "@/lib/react-query/keys";
import { formatPrice } from "@/lib/utils/base";
import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useTranslations } from "next-intl";

type SharedConversationViewProps = {
  shareId: string;
};

export function SharedConversationView(props: SharedConversationViewProps) {
  const t = useTranslations();
  const query = useSharedConversationQuery(props.shareId);

  if (!query.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">{t("CHAT.SHARED_NOT_FOUND")}</p>
      </div>
    );
  }

  const raw = query.data.messages as Array<Record<string, unknown>>;
  const messages = mapRawMessages(query.data.messages);
  const { totalInputTokens, totalOutputTokens, totalCost } = query.data;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {(totalInputTokens > 0 || totalOutputTokens > 0) && (
        <div className="absolute top-2 right-4 z-10 flex items-center gap-3">
          <div className="text-muted-foreground flex items-center gap-2 text-[11px] tabular-nums">
            <span>
              {totalInputTokens.toLocaleString()} {t("CHAT.TOKENS_IN")}
            </span>
            <span>
              {totalOutputTokens.toLocaleString()} {t("CHAT.TOKENS_OUT")}
            </span>
            {totalCost > 0 && (
              <span className="text-foreground/70 font-medium">
                {formatPrice(totalCost)}
              </span>
            )}
          </div>
        </div>
      )}
      <SharedThread shareId={props.shareId} messages={messages} rawMessages={raw} />
    </div>
  );
}

function SharedThread(props: {
  shareId: string;
  messages: UIMessage[];
  rawMessages: Array<Record<string, unknown>>;
}) {
  const chat = useChat({ messages: props.messages });
  const runtime = useAISDKRuntime(chat);
  const queryClient = useQueryClient();

  const cacheKey = queryKeys.chatMessages(props.shareId);
  if (!queryClient.getQueryData(cacheKey)) {
    queryClient.setQueryData(cacheKey, {
      pages: [{ messages: props.rawMessages, total: props.rawMessages.length }],
      pageParams: [1],
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <SharedConvIdProvider id={props.shareId}>
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread readOnly />
        </AssistantRuntimeProvider>
      </SharedConvIdProvider>
    </div>
  );
}
