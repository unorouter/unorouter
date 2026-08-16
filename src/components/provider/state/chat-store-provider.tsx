"use client";

import {
  chatStoreAtom,
  INITIAL_CHAT_STATE,
  type ChatState,
} from "@/store/chat-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

// Seeds chatStoreAtom from the server's own read of the chat-store cookie, so the
// server render and the client's first pass hold the same values. Without it the
// atom's getOnInit makes the client start from the cookie while the server starts
// from INITIAL_CHAT_STATE, and the model name in ChatControls renders differently
// on each side: React #418, which is what reverted this pattern twice before.
export function ChatStoreProvider(props: {
  children: ReactNode;
  data?: ChatState;
}) {
  // No dangerouslyForceHydrate: that flag re-runs store.set on EVERY render, so
  // once any mounted consumer re-rendered this wrote during render and React
  // reported "cannot update a component while rendering a different one". The
  // default hydrates once per store, which is all the server seed needs.
  useHydrateAtoms([[chatStoreAtom, props.data ?? INITIAL_CHAT_STATE]]);

  return <>{props.children}</>;
}
