"use client";

import {
  chatStoreAtom,
  INITIAL_CHAT_STATE,
  type ChatState,
} from "@/store/chat-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

// Load-bearing half of the chatStoreAtom getOnInit pair (see CLAUDE.md "State"); removing
// it alone reintroduces React #418.
export function ChatStoreProvider(props: {
  children: ReactNode;
  data?: ChatState;
}) {
  // No dangerouslyForceHydrate: it re-runs store.set on EVERY render, which writes during
  // render once any consumer has mounted.
  useHydrateAtoms([[chatStoreAtom, props.data ?? INITIAL_CHAT_STATE]]);

  return <>{props.children}</>;
}
