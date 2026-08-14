"use client";

import dynamic from "next/dynamic";
import { type ComponentProps } from "react";

const ChatMockAnimated = dynamic(
  () => import("./chat-mock-animated").then((m) => m.ChatMockAnimated),
  { ssr: false },
);

// ssr:false defers the chunk to the client, so it needs a boundary to suspend
// against while that chunk loads.
export function ChatMockLazy(props: ComponentProps<typeof ChatMockAnimated>) {
  return <ChatMockAnimated {...props} />;
}
