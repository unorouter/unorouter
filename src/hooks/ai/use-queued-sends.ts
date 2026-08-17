"use client";

import { findUnansweredUserTurns } from "@/lib/db/client/data/chat/queued-send";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";

export function useQueuedSends() {
  return useQuery({
    queryKey: queryKeys.queuedSends(),
    queryFn: async () => {
      const turns = await findUnansweredUserTurns();
      return new Set(turns.map((turn) => turn.convId));
    },
  });
}
