"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  createR2AttachmentAdapter,
  extractParts,
  mapRawMessages,
} from "@/components/pages/chat/chat-helpers";
import { ShareButton } from "@/components/pages/chat/thread/share-button";
import {
  useConversationQuery,
  useCreateConversationMutation,
  usePersistMessagesMutation,
} from "@/hooks/chat-hook";
import { uid } from "@/lib/utils/base";
import {
  newChatModelAtom,
  selectedConversationAtom,
} from "@/store/client-store";
import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";

type ChatThreadProps = {
  convId?: string | null;
};

export function ChatThread(props: ChatThreadProps) {
  const convId = props.convId ?? null;
  const [threadKey, setThreadKey] = useState(() => convId ?? "new");

  const prevConvIdRef = useRef(convId);
  useEffect(() => {
    const prev = prevConvIdRef.current;
    prevConvIdRef.current = convId;

    // Skip null->id transitions caused by ChatThreadInner creating a conversation
    if (prev === null && convId !== null) return;

    if (convId !== prev) {
      setThreadKey(convId ?? "new");
    }
  }, [convId]);

  if (threadKey === "new")
    return <ChatThreadInner key="new" convId={null} initialMessages={[]} />;

  return <ChatThreadLoader key={threadKey} convId={threadKey} />;
}

function ChatThreadLoader(props: { convId: string }) {
  const conversationQuery = useConversationQuery(props.convId);
  const setSelectedConversation = useSetAtom(selectedConversationAtom);

  useEffect(() => {
    if (conversationQuery.isError) {
      setSelectedConversation(null);
    }
  }, [conversationQuery.isError, setSelectedConversation]);

  if (!conversationQuery.data) return null;

  const messages = mapRawMessages(
    conversationQuery.data.messages as {
      id: string;
      role: string;
      parts: unknown;
    }[],
  );

  return (
    <ChatThreadInner
      convId={props.convId}
      initialMessages={messages}
      model={conversationQuery.data.model}
    />
  );
}

function ChatThreadInner(props: {
  convId: string | null;
  initialMessages: UIMessage[];
  model?: string;
}) {
  const [activeConvId, setActiveConvId] = useState(props.convId);

  const persistMutation = usePersistMessagesMutation();
  const createMutation = useCreateConversationMutation();
  const setSelectedConversation = useSetAtom(selectedConversationAtom);
  const newChatModel = useAtomValue(newChatModelAtom);
  const model = props.model ?? newChatModel!;

  const contextRef = useRef({ convId: activeConvId, msgId: "" });
  useEffect(() => {
    contextRef.current.convId = activeConvId;
  }, [activeConvId]);

  const transport = new DefaultChatTransport({
    api: "/api/chat/stream",
    body: () => ({ model, convId: contextRef.current.convId }),
  });

  const pendingCreateRef = useRef(false);

  const chat = useChat({
    transport,
    messages:
      props.initialMessages.length > 0 ? props.initialMessages : undefined,
    onFinish: ({ message }) => {
      const convId = contextRef.current.convId;
      if (!convId) return;
      persistMutation.mutate({
        id: convId,
        body: {
          messages: [
            {
              id: message.id,
              role: message.role,
              parts: message.parts as { type: string; text?: string }[],
            },
          ],
        },
      });
    },
  });

  const sendRef = useRef(chat.sendMessage);
  sendRef.current = chat.sendMessage;

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      // Create conversation on first message
      if (!activeConvId && !pendingCreateRef.current) {
        pendingCreateRef.current = true;
        try {
          const data = await new Promise<{ id: string }>((resolve, reject) =>
            createMutation.mutate(
              { body: { model } },
              { onSuccess: resolve, onError: reject },
            ),
          );
          contextRef.current.convId = data.id;
          setActiveConvId(data.id);
          setSelectedConversation(data.id);
        } catch {
          pendingCreateRef.current = false;
          return;
        }
      }

      // Persist user message
      const parts = extractParts(args[0]);
      const convId = contextRef.current.convId;
      if (convId && parts.length > 0) {
        const msgId = uid();
        contextRef.current.msgId = msgId;
        persistMutation.mutate({
          id: convId,
          body: { messages: [{ id: msgId, role: "user", parts }] },
        });
      }

      return sendRef.current(...args);
    },
  };

  const attachmentAdapter = createR2AttachmentAdapter(() => ({
    convId: contextRef.current.convId,
    msgId: contextRef.current.msgId,
  }));

  const runtime = useAISDKRuntime(wrappedChat, {
    adapters: { attachments: attachmentAdapter },
  });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {activeConvId && (
        <div className="absolute top-2 right-4 z-10">
          <ShareButton convId={activeConvId} />
        </div>
      )}
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}
