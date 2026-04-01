"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { Skeleton } from "@/components/ui/skeleton";
import { useSharedConversationQuery } from "@/hooks/chat-hook";
import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { useTranslations } from "next-intl";

type SharedConversationViewProps = {
  shareId: string;
};

export function SharedConversationView(props: SharedConversationViewProps) {
  const t = useTranslations();
  const query = useSharedConversationQuery(props.shareId);

  if (!query.data) {
    if (query.isLoading) {
      return (
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-3/4" />
          <Skeleton className="ml-auto h-24 w-2/3" />
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">{t("CHAT.SHARED_NOT_FOUND")}</p>
      </div>
    );
  }

  const messages: UIMessage[] = (
    query.data.messages as { id: string; role: string; parts: unknown }[]
  ).map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: (msg.parts as UIMessage["parts"]) ?? [],
  }));

  return <SharedThread messages={messages} />;
}

function SharedThread(props: { messages: UIMessage[] }) {
  const chat = useChat({
    messages: props.messages,
  });

  const runtime = useAISDKRuntime(chat);

  return (
    <div className="flex flex-1 flex-col">
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}
