"use client";

import { chatStore } from "@/store/chat-store";
import { Provider } from "jotai";
import type { ReactNode } from "react";

export function JotaiProvider(props: { children: ReactNode }) {
  return <Provider store={chatStore}>{props.children}</Provider>;
}
