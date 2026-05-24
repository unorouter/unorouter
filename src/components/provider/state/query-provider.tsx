"use client";

import getQueryClient from "@/lib/react-query/client";
import { subscribeInvalidate } from "@/lib/react-query/cross-tab-invalidate";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";

export function QueryProvider(props: { children: ReactNode }) {
  const queryClient = getQueryClient();

  // Cross-tab cache invalidation. Mutations broadcast affected keys after
  // they finish writing locally; this listener calls invalidateQueries in
  // every other tab so reads refetch from the shared SQLocal DB.
  useEffect(() => subscribeInvalidate(queryClient), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}
