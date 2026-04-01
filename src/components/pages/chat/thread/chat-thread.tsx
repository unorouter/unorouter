"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ShareButton } from "@/components/pages/chat/thread/share-button";
import {
  useConversationQuery,
  useCreateConversationMutation,
  usePersistMessagesMutation,
} from "@/hooks/chat-hook";
import { createR2AttachmentAdapter } from "@/components/pages/chat/attachment-adapter";
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

  // When the parent passes a different convId (sidebar click, new chat button),
  // reset the thread key to force a remount.
  const prevConvIdRef = useRef(convId);
  useEffect(() => {
    const prev = prevConvIdRef.current;
    prevConvIdRef.current = convId;

    // Skip null→id transitions caused by ChatThreadInner creating a conversation
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

  if (!conversationQuery.data) return null;

  const messages: UIMessage[] = (
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
  const isNewChat = !activeConvId;

  const persistMutation = usePersistMessagesMutation();
  const createMutation = useCreateConversationMutation();
  const setSelectedConversation = useSetAtom(selectedConversationAtom);
  const newChatModel = useAtomValue(newChatModelAtom);
  const model = props.model ?? newChatModel!;

  const contextRef = useRef({ convId: activeConvId, msgId: `user-${Date.now()}` });
  useEffect(() => {
    contextRef.current.convId = activeConvId;
  }, [activeConvId]);

  const transport = new DefaultChatTransport({
    api: "/api/chat/stream",
    body: { model },
  });

  const pendingCreateRef = useRef(false);

  const chat = useChat({
    transport,
    messages:
      props.initialMessages.length > 0 ? props.initialMessages : undefined,
    onFinish: ({ message }) => {
      const targetConvId = contextRef.current.convId;
      if (!targetConvId) return;
      persistMutation.mutate({
        id: targetConvId,
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

  const origSendRef = useRef(chat.sendMessage);
  origSendRef.current = chat.sendMessage;

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      const textArg = args[0];
      let text = "";
      const parts: { type: string; [key: string]: unknown }[] = [];

      if (typeof textArg === "string") {
        text = textArg;
        parts.push({ type: "text", text });
      } else if (textArg && typeof textArg === "object") {
        const msg = textArg as {
          text?: string;
          parts?: { type: string; text?: string; [key: string]: unknown }[];
        };
        if (msg.parts) {
          for (const p of msg.parts) {
            if (p.type === "text" && p.text) {
              text += p.text;
            }
            parts.push(p);
          }
        } else if (msg.text) {
          text = msg.text;
          parts.push({ type: "text", text });
        }
      }

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
          setActiveConvId(data.id);
          setSelectedConversation(data.id);
        } catch {
          pendingCreateRef.current = false;
          return;
        }
      }

      // Persist user message with all parts (text + file)
      const targetConvId = contextRef.current.convId;
      if (targetConvId && parts.length > 0) {
        const msgId = `user-${Date.now()}`;
        contextRef.current.msgId = msgId;
        persistMutation.mutate({
          id: targetConvId,
          body: {
            messages: [
              {
                id: msgId,
                role: "user",
                parts,
              },
            ],
          },
        });
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
