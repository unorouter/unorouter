"use client";

import { localUserIdAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";

// The authoritative local-DB owner (real user id, or GUEST_USER_ID). Seeded
// server-side by UserIdProvider, so it is correct on first render with no
// auth-query race. Use this instead of `auth.data?.id ?? GUEST_USER_ID`.
export function useLocalUserId(): number {
  return useAtomValue(localUserIdAtom);
}
