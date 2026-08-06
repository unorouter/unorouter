"use client";

import dynamic from "next/dynamic";
import { Suspense, type ComponentProps } from "react";

const ChatMockAnimated = dynamic(
  () => import("./chat-mock-animated").then((m) => m.ChatMockAnimated),
  { ssr: false },
);

// ssr:false is a CSR bailout: without its own Suspense boundary it ejects the
// whole page from the PPR static shell.
export function ChatMockLazy(props: ComponentProps<typeof ChatMockAnimated>) {
  return (
    <Suspense fallback={null}>
      <ChatMockAnimated {...props} />
    </Suspense>
  );
}
