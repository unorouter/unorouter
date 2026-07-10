import { ConfirmProvider } from "@/components/ui/confirm";
import { TriggerAlertProvider } from "@/components/ui/trigger-alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCookieValue, getResolvedUserId } from "@/lib/utils/server";
import { CHAT_STORE_KEY, type ChatState } from "@/store/chat-store";
import { CLIENT_STORE_KEY, type ClientState } from "@/store/client-store";
import { MODELS_STORE_KEY, type ModelsStoreState } from "@/store/models-store";
import { ReactNode, use } from "react";
import { LanguageProvider } from "./app/language-provider";
import { PostHogProvider } from "./app/posthog-provider";
import { ThemeProvider } from "./app/theme-provider";
import { UserProvider } from "./app/user-provider";
import { UserThemeProvider } from "@/components/ui/theme/theme-provider";
import { WebMcpProvider } from "./app/webmcp-provider";
import { AppPrefetchProvider } from "./state/app-prefetch-provider";
import { ChatStoreProvider } from "./state/chat-store-provider";
import { ClientProvider } from "./state/client-provider";
import { UserIdProvider } from "./state/user-id-provider";
import { JotaiProvider } from "./state/jotai-provider";
import { ModelsStoreProvider } from "./state/models-store-provider";
import { QueryProvider } from "./state/query-provider";

export function Providers(props: { children: ReactNode }) {
  const modelsStore = use(getCookieValue<ModelsStoreState>(MODELS_STORE_KEY));
  const clientStore = use(getCookieValue<ClientState>(CLIENT_STORE_KEY));
  const chatStoreCookie = use(getCookieValue<ChatState>(CHAT_STORE_KEY));
  const localUserId = use(getResolvedUserId());

  return (
    <QueryProvider>
      <JotaiProvider>
        <ModelsStoreProvider data={modelsStore}>
          <ChatStoreProvider data={chatStoreCookie}>
            <UserIdProvider userId={localUserId}>
              <ClientProvider data={clientStore}>
                <UserProvider>
                  <LanguageProvider>
                    <ThemeProvider>
                      <UserThemeProvider>
                        <PostHogProvider>
                          <WebMcpProvider />
                          <ConfirmProvider />
                          <TriggerAlertProvider />
                          <TooltipProvider>
                            <AppPrefetchProvider>
                              {props.children}
                            </AppPrefetchProvider>
                          </TooltipProvider>
                        </PostHogProvider>
                      </UserThemeProvider>
                    </ThemeProvider>
                  </LanguageProvider>
                </UserProvider>
              </ClientProvider>
            </UserIdProvider>
          </ChatStoreProvider>
        </ModelsStoreProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
