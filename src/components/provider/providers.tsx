import { TooltipProvider } from "@/components/ui/tooltip";
import { getCookieValue } from "@/lib/utils/server";
import { API_KEY_COOKIE } from "@/store/api-key-store";
import { MODELS_STORE_KEY, type ModelsStoreState } from "@/store/models-store";
import {
  NAVIGATION_STORE_KEY,
  type NavigationState,
} from "@/store/navigation-store";
import { ReactNode, use } from "react";
import { ApiKeyProvider } from "./api-key-provider";
import { JotaiProvider } from "./jotai-provider";
import { LanguageProvider } from "./language-provider";
import { ModelsStoreProvider } from "./models-store-provider";
import { NavigationStoreProvider } from "./navigation-store-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { UserProvider } from "./user-provider";

export function Providers(props: { children: ReactNode }) {
  const navigationStore = use(
    getCookieValue<NavigationState>(NAVIGATION_STORE_KEY),
  );
  const modelsStore = use(getCookieValue<ModelsStoreState>(MODELS_STORE_KEY));
  const apiKey = use(getCookieValue<string>(API_KEY_COOKIE));

  return (
    <QueryProvider>
      <JotaiProvider>
        <NavigationStoreProvider data={navigationStore}>
          <ModelsStoreProvider data={modelsStore}>
            <UserProvider>
              <ApiKeyProvider data={apiKey}>
                <LanguageProvider>
                  <ThemeProvider>
                    <TooltipProvider>{props.children}</TooltipProvider>
                  </ThemeProvider>
                </LanguageProvider>
              </ApiKeyProvider>
            </UserProvider>
          </ModelsStoreProvider>
        </NavigationStoreProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
