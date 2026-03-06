import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ReactNode } from "react";
import { LanguageProvider } from "./language-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";

export async function Providers(props: { children: ReactNode }) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () => handleElysia(await rpc.api.auth.self.get()),
  });

  return (
    <QueryProvider>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <LanguageProvider>
          <ThemeProvider>{props.children}</ThemeProvider>
        </LanguageProvider>
      </HydrationBoundary>
    </QueryProvider>
  );
}
