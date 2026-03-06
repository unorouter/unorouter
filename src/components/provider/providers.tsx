import { fetchSelfServer } from "@/lib/api/server";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { JotaiProvider } from "./jotai-provider";
import { LanguageProvider } from "./language-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export async function Providers(props: { children: ReactNode }) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.auth(),
    queryFn: fetchSelfServer,
  });

  return (
    <QueryProvider>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <JotaiProvider>
          <AuthProvider>
            <LanguageProvider>
              <ThemeProvider>{props.children}</ThemeProvider>
            </LanguageProvider>
          </AuthProvider>
        </JotaiProvider>
      </HydrationBoundary>
    </QueryProvider>
  );
}
