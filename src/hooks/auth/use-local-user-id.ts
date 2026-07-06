"use client";

import { localUserIdAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";

export function useLocalUserId(): number {
  return useAtomValue(localUserIdAtom);
}
