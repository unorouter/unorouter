"use client";

import { useSharedConversationQuery } from "@/hooks/chat-hook";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMessage } from "./chat-message";
import { useTranslations } from "next-intl";
import { LuMessageCircle } from "react-icons/lu";
import type { UIMessage } from "ai";
import dayjs from "dayjs";

type SharedConversationViewProps = {
  shareId: string;
};

export function SharedConversationView(props: SharedConversationViewProps) {
  const t = useTranslations();
  const query = useSharedConversationQuery(props.shareId);

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-3/4" />
        <Skeleton className="ml-auto h-24 w-2/3" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">{t("CHAT.SHARED_NOT_FOUND")}</p>
      </div>
    );
  }

  const conv = query.data;
  const messages = (conv.messages ?? []).map(
    (msg: { id: string; role: string; parts: unknown }) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: (msg.parts as UIMessage["parts"]) ?? [],
    }),
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-2">
          <LuMessageCircle className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("CHAT.SHARED_CONVERSATION")}
          </span>
        </div>
        <h1 className="text-foreground text-xl font-semibold">
          {conv.title || t("CHAT.UNTITLED")}
        </h1>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="font-mono">{conv.model}</span>
          <span>&middot;</span>
          <span>{dayjs(conv.createdAt).format("MMM D, YYYY")}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-6">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}
