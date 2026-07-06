"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { findUnansweredUserTurns } from "@/lib/db/client/data/chat/queued-send";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";

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
