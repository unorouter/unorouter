import { ConfirmProvider } from "@/components/ui/confirm";
import { TriggerAlertProvider } from "@/components/ui/trigger-alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactNode, Suspense } from "react";
import { LanguageProvider } from "./app/language-provider";
import { PostHogProvider } from "./app/posthog-provider";
import { ThemeProvider } from "./app/theme-provider";
import { UserThemeProvider } from "@/components/ui/theme/theme-provider";
import { WebMcpProvider } from "./app/webmcp-provider";
import { AuthPrefetch } from "./state/auth-prefetch";
import { JotaiProvider } from "./state/jotai-provider";
import { LocalUserIdSync } from "./state/local-user-id-sync";
import { QueryProvider } from "./state/query-provider";

export function Providers(props: { children: ReactNode }) {
  return (
    <QueryProvider>
      <JotaiProvider>
        <LocalUserIdSync />
        <Suspense>
          <AuthPrefetch />
        </Suspense>
        <LanguageProvider>
          <ThemeProvider>
            <UserThemeProvider>
              <PostHogProvider>
                <WebMcpProvider />
                <ConfirmProvider />
                <TriggerAlertProvider />
                <TooltipProvider>{props.children}</TooltipProvider>
              </PostHogProvider>
            </UserThemeProvider>
          </ThemeProvider>
        </LanguageProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
