"use client";

import getQueryClient from "@/lib/react-query/client";
import { subscribeInvalidate } from "@/lib/react-query/cross-tab-invalidate";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";

export function QueryProvider(props: { children: ReactNode }) {
  const queryClient = getQueryClient();

  // Cross-tab invalidation: mutations broadcast keys; listener invalidates.
  useEffect(() => subscribeInvalidate(queryClient), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );
}
