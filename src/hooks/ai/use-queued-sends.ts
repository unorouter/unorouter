"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { findUnansweredUserTurns } from "@/lib/db/client/data/queued-send";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";

    // ConvIds with an unanswered user turn, for UI badges. Local DB only; invalidated by the offline-persist + replay paths.
export function useQueuedSends() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.queuedSends(),
    queryFn: async () => {
      const turns = await findUnansweredUserTurns(userId);
      return new Set(turns.map((turn) => turn.convId));
    },
  });
}
