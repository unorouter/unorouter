"use client";

import dynamic from "next/dynamic";

export const ChatMockLazy = dynamic(
  () => import("./chat-mock-animated").then((m) => m.ChatMockAnimated),
  { ssr: false },
);
