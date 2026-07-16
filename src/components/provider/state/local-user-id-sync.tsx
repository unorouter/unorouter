"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { localUserIdAtom } from "@/store/chat-store";
import { useAtom } from "jotai";
import { useEffect } from "react";

// Keeps localUserIdAtom (plain local-user-id cookie) aligned with the auth
// session: backfills sessions created before the twin cookie existed and
// resets to guest after logout without a reload.
export function LocalUserIdSync() {
  const authQuery = useAuthQuery();
  const [localUserId, setLocalUserId] = useAtom(localUserIdAtom);

  useEffect(() => {
    if (authQuery.status !== "success") return;
    const sessionId = authQuery.data?.id ?? GUEST_USER_ID;
    if (sessionId !== localUserId) {
      logChatDebug("user.local_id_changed", {
        from: localUserId,
        to: sessionId,
      });
      setLocalUserId(sessionId);
    }
  }, [authQuery.status, authQuery.data, localUserId, setLocalUserId]);

  return null;
}
