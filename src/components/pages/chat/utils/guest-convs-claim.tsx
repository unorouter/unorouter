"use client";

import { useClaimConversationsMutation } from "@/hooks/chat-hook";
import { useAuthQuery } from "@/hooks/auth-hook";
import { clearGuestConvIds, getGuestConvIds } from "@/store/chat-store";
import { useEffect, useRef } from "react";

export function GuestConvsClaim() {
  const authQuery = useAuthQuery();
  const claimMutation = useClaimConversationsMutation();
  const claimed = useRef(false);

  useEffect(() => {
    if (!authQuery.data || claimed.current || claimMutation.isPending) return;
    const guestIds = getGuestConvIds();
    if (guestIds.length === 0) return;

    claimed.current = true;
    claimMutation.mutate(guestIds, {
      onSuccess: () => clearGuestConvIds(),
    });
  }, [authQuery.data, claimMutation]);

  return null;
}
