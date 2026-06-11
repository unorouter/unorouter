"use client";

import {
  chatStoreAtom,
  INITIAL_CHAT_STATE,
  type ChatState,
} from "@/store/chat-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function ChatStoreProvider(props: {
  children: ReactNode;
  data?: ChatState;
}) {
  useHydrateAtoms([[chatStoreAtom, props.data ?? INITIAL_CHAT_STATE]], {
    dangerouslyForceHydrate: true,
  });

  return <>{props.children}</>;
}
