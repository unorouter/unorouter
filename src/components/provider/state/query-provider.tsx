"use client";

import getQueryClient from "@/lib/react-query/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

export function QueryProvider(props: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}
