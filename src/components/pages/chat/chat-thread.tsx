"use client";

import { useConversationQuery, usePersistMessagesMutation } from "@/hooks/chat-hook";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMessage } from "./chat-message";
import { ShareDialog } from "./share-dialog";
import { LuArrowUp, LuLoader, LuPaperclip, LuSquare } from "react-icons/lu";

type ChatThreadProps = {
  convId: string;
};

export function ChatThread(props: ChatThreadProps) {
  const t = useTranslations();
  const conversationQuery = useConversationQuery(props.convId);
  const persistMutation = usePersistMessagesMutation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState(
    conversationQuery.data?.model ?? "gpt-5.4-mini",
  );
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/stream",
        body: { model },
      }),
    [model],
  );

  // Load initial messages from DB
  const initialMessages: UIMessage[] = useMemo(() => {
    if (!conversationQuery.data?.messages) return [];
    return (conversationQuery.data.messages as { id: string; role: string; parts: unknown }[]).map(
      (msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        parts: (msg.parts as UIMessage["parts"]) ?? [],
      }),
    );
  }, [conversationQuery.data?.messages]);

  const chat = useChat({
    transport,
    messages: initialMessages.length > 0 ? initialMessages : undefined,
    onFinish: ({ message }) => {
      const textContent = message.parts
        ?.filter((p) => p.type === "text")
        .map((p) => ("text" in p ? p.text : ""))
        .join("") ?? "";
      persistMutation.mutate({
        convId: props.convId,
        messages: [
          {
            id: message.id,
            role: message.role,
            parts: [{ type: "text", text: textContent }],
          },
        ],
      });
    },
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages]);

  // Update model from conversation data
  useEffect(() => {
    if (conversationQuery.data?.model) {
      setModel(conversationQuery.data.model);
    }
  }, [conversationQuery.data?.model]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    // Persist the user message
    persistMutation.mutate({
      convId: props.convId,
      messages: [
        {
          id: `user-${Date.now()}`,
          role: "user",
          parts: [{ type: "text", text }],
        },
      ],
    });

    chat.sendMessage({ text });
    setInput("");
  };

  if (conversationQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-3/4" />
        <Skeleton className="ml-auto h-24 w-2/3" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          {chat.messages.length === 0 && (
            <div className="text-muted-foreground py-20 text-center text-sm">
              {t("CHAT.START_PROMPT")}
            </div>
          )}
          {chat.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {chat.status === "submitted" && (
            <div className="flex items-center gap-2">
              <LuLoader className="text-muted-foreground h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-sm">
                {t("CHAT.THINKING")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-border border-t p-4">
        <div className="mx-auto max-w-3xl">
          <div className="bg-muted/50 border-border relative rounded-lg border">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("CHAT.INPUT_PLACEHOLDER")}
              className="min-h-15 resize-none border-0 bg-transparent pr-24 shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-8 w-8"
              >
                <LuPaperclip className="h-4 w-4" />
              </Button>
              {chat.status === "streaming" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={chat.stop}
                >
                  <LuSquare className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!input.trim()}
                  onClick={handleSend}
                >
                  <LuArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-center text-[11px]">
            {t("CHAT.DISCLAIMER")}
          </p>
        </div>
      </div>
    </div>
  );
}
