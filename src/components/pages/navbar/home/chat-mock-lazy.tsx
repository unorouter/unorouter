"use client";

import dynamic from "next/dynamic";

// A client module of its own: server components may not use ssr:false.
export const ChatMockLazy = dynamic(
  () => import("./chat-mock-animated").then((m) => m.ChatMockAnimated),
  { ssr: false },
);
