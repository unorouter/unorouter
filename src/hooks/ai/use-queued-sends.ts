"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { findUnansweredUserTurns } from "@/lib/db/client/data/queued-send";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";

// Set of convIds with a pending (unanswered) user turn, for UI badges. Reads
// the local DB only; invalidated by the offline-persist + replay paths.
export function useQueuedSends() {
  const auth = useAuthQuery();
  const userId = auth.data?.id ?? GUEST_USER_ID;
  return useQuery({
    queryKey: queryKeys.queuedSends(),
    queryFn: async () => {
      const turns = await findUnansweredUserTurns(userId);
      return new Set(turns.map((turn) => turn.convId));
    },
  });
}
