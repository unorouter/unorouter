"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConversationQuery,
  useCreateConversationMutation,
  usePersistMessagesMutation,
} from "@/hooks/chat-hook";
import { createR2AttachmentAdapter } from "@/lib/chat/attachment-adapter";
import {
  newChatModelAtom,
  selectedConversationAtom,
} from "@/store/client-store";
import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";

type ChatThreadProps = {
  convId?: string | null;
};

export function ChatThread(props: ChatThreadProps) {
  const convId = props.convId ?? null;
  const isNewChat = !convId;

  const conversationQuery = useConversationQuery(convId ?? "");
  const persistMutation = usePersistMessagesMutation();
  const createMutation = useCreateConversationMutation();
  const setSelectedConversation = useSetAtom(selectedConversationAtom);
  const newChatModel = useAtomValue(newChatModelAtom);
  const model = conversationQuery.data?.model ?? newChatModel!;

  // Ref for attachment adapter context (convId can change after creation)
  const contextRef = useRef({ convId, msgId: `user-${Date.now()}` });
  useEffect(() => {
    contextRef.current.convId = convId;
  }, [convId]);

  const transport = new DefaultChatTransport({
    api: "/api/chat/stream",
    body: { model },
  });

  const initialMessages: UIMessage[] =
    isNewChat || !conversationQuery.data?.messages
      ? []
      : (
          conversationQuery.data.messages as {
            id: string;
            role: string;
            parts: unknown;
          }[]
        ).map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant" | "system",
          parts: (msg.parts as UIMessage["parts"]) ?? [],
        }));

  // Track whether we need to create a conversation on first send
  const pendingCreateRef = useRef(false);

  const chat = useChat({
    transport,
    messages: initialMessages.length > 0 ? initialMessages : undefined,
    onFinish: ({ message }) => {
      const targetConvId = contextRef.current.convId;
      if (!targetConvId) return;
      const textContent =
        message.parts
          ?.filter((p) => p.type === "text")
          .map((p) => ("text" in p ? p.text : ""))
          .join("") ?? "";
      persistMutation.mutate({
        id: targetConvId,
        body: {
          messages: [
            {
              id: message.id,
              role: message.role,
              parts: [{ type: "text", text: textContent }],
            },
          ],
        },
      });
    },
  });

  // Intercept sends for new chats: create conversation first
  const origSendRef = useRef(chat.sendMessage);
  origSendRef.current = chat.sendMessage;

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      if (isNewChat && !pendingCreateRef.current) {
        pendingCreateRef.current = true;
        try {
          const data = await new Promise<{ id: string }>((resolve, reject) =>
            createMutation.mutate(
              { body: { model } },
              { onSuccess: resolve, onError: reject },
            ),
          );
          contextRef.current.convId = data.id;
          setSelectedConversation(data.id);

          // Persist the user message
          const textArg = args[0];
          const text =
            typeof textArg === "string"
              ? textArg
              : ((textArg as { text?: string })?.text ?? "");
          if (text) {
            const msgId = `user-${Date.now()}`;
            contextRef.current.msgId = msgId;
            persistMutation.mutate({
              id: data.id,
              body: {
                messages: [
                  {
                    id: msgId,
                    role: "user",
                    parts: [{ type: "text", text }],
                  },
                ],
              },
            });
          }
        } catch {
          pendingCreateRef.current = false;
          return;
        }
      }

      return origSendRef.current(...args);
    },
  };

  const attachmentAdapter = createR2AttachmentAdapter(() => ({
    convId: contextRef.current.convId,
    msgId: contextRef.current.msgId,
  }));

  const runtime = useAISDKRuntime(wrappedChat, {
    adapters: {
      attachments: attachmentAdapter,
    },
  });

  if (!isNewChat && conversationQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-3/4" />
        <Skeleton className="ml-auto h-24 w-2/3" />
      </div>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
