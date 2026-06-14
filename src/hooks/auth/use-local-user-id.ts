"use client";

import { localUserIdAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";

    // Authoritative local-DB owner (user id or GUEST_USER_ID). Server-seeded by UserIdProvider so it's correct on first render.
export function useLocalUserId(): number {
  return useAtomValue(localUserIdAtom);
}
