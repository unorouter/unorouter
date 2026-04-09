import { TooltipProvider } from "@/components/ui/tooltip";
import { getCookieValue } from "@/lib/utils/server";
import { CLIENT_STORE_KEY, type ClientState } from "@/store/client-store";
import { MODELS_STORE_KEY, type ModelsStoreState } from "@/store/models-store";
import {
  NAVIGATION_STORE_KEY,
  type NavigationState,
} from "@/store/navigation-store";
import { ReactNode, use } from "react";
import { LanguageProvider } from "./app/language-provider";
import { PostHogProvider } from "./app/posthog-provider";
import { ThemeProvider } from "./app/theme-provider";
import { UserProvider } from "./app/user-provider";
import { ClientProvider } from "./state/client-provider";
import { JotaiProvider } from "./state/jotai-provider";
import { ModelsStoreProvider } from "./state/models-store-provider";
import { NavigationStoreProvider } from "./state/navigation-store-provider";
import { QueryProvider } from "./state/query-provider";

export function Providers(props: { children: ReactNode }) {
  const navigationStore = use(
    getCookieValue<NavigationState>(NAVIGATION_STORE_KEY),
  );
  const modelsStore = use(getCookieValue<ModelsStoreState>(MODELS_STORE_KEY));
  const clientStore = use(getCookieValue<ClientState>(CLIENT_STORE_KEY));

  return (
    <QueryProvider>
      <JotaiProvider>
        <NavigationStoreProvider data={navigationStore}>
          <ModelsStoreProvider data={modelsStore}>
            <ClientProvider data={clientStore}>
              <UserProvider>
                <LanguageProvider>
                  <ThemeProvider>
                    <PostHogProvider>
                      <TooltipProvider>{props.children}</TooltipProvider>
                    </PostHogProvider>
                  </ThemeProvider>
                </LanguageProvider>
              </UserProvider>
            </ClientProvider>
          </ModelsStoreProvider>
        </NavigationStoreProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
