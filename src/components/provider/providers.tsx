import { ConfirmProvider } from "@/components/ui/confirm";
import { TriggerAlertProvider } from "@/components/ui/trigger-alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactNode } from "react";
import { LanguageProvider } from "./app/language-provider";
import { PostHogProvider } from "./app/posthog-provider";
import { ThemeProvider } from "./app/theme-provider";
import { UserProvider } from "./app/user-provider";
import { UserThemeProvider } from "@/components/ui/theme/theme-provider";
import { WebMcpProvider } from "./app/webmcp-provider";
import { AppPrefetchProvider } from "./state/app-prefetch-provider";
import { JotaiProvider } from "./state/jotai-provider";
import { LocalUserIdSync } from "./state/local-user-id-sync";
import { QueryProvider } from "./state/query-provider";

export function Providers(props: { children: ReactNode }) {
  return (
    <QueryProvider>
      <JotaiProvider>
        <LocalUserIdSync />
        <UserProvider>
          <LanguageProvider>
            <ThemeProvider>
              <UserThemeProvider>
                <PostHogProvider>
                  <WebMcpProvider />
                  <ConfirmProvider />
                  <TriggerAlertProvider />
                  <TooltipProvider>
                    <AppPrefetchProvider>{props.children}</AppPrefetchProvider>
                  </TooltipProvider>
                </PostHogProvider>
              </UserThemeProvider>
            </ThemeProvider>
          </LanguageProvider>
        </UserProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
