import { ConfirmProvider } from "@/components/ui/confirm";
import { TriggerAlertProvider } from "@/components/ui/trigger-alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactNode } from "react";
import { LanguageProvider } from "./app/language-provider";
import { PostHogProvider } from "./app/posthog-provider";
import { ThemeProvider } from "./app/theme-provider";
import { UserThemeProvider } from "@/components/provider/app/user-theme-provider";
import type { UserTheme } from "@/lib/theme/theme-types";
import { WebMcpProvider } from "./app/webmcp-provider";
import { JotaiProvider } from "./state/jotai-provider";
import { UserThemeStoreProvider } from "./state/user-theme-store-provider";
import { QueryProvider } from "./state/query-provider";
import { DbTransferDialogLoader } from "@/components/pages/sidebar/chat/chat-actions-menu/db-transfer-dialog-loader";

export function Providers(props: {
  children: ReactNode;
  userTheme?: UserTheme;
}) {
  return (
    <QueryProvider>
      <JotaiProvider>
        <UserThemeStoreProvider data={props.userTheme}>
          <LanguageProvider>
            <ThemeProvider>
              <UserThemeProvider>
                <PostHogProvider>
                  <WebMcpProvider />
                  <ConfirmProvider />
                  <DbTransferDialogLoader />
                  <TriggerAlertProvider />
                  <TooltipProvider>{props.children}</TooltipProvider>
                </PostHogProvider>
              </UserThemeProvider>
            </ThemeProvider>
          </LanguageProvider>
        </UserThemeStoreProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
