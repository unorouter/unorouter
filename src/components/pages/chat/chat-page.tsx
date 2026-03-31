"use client";

import { selectedConversationAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";
import { ChatThread } from "./thread/chat-thread";
import { ChatEmptyState } from "./thread/chat-empty-state";

export function ChatPage() {
  const selectedId = useAtomValue(selectedConversationAtom);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {selectedId ? <ChatThread convId={selectedId} /> : <ChatEmptyState />}
    </div>
  );
}
