"use client";

import dynamic from "next/dynamic";

// Self-playing demo pulls in `motion` + the timeline driver; keep it off the home
// first-paint bundle. ssr:false must live in a client component (Next 16 rule).
export const ChatMockLazy = dynamic(
  () => import("./chat-mock-animated").then((m) => m.ChatMockAnimated),
  { ssr: false },
);
