import { TooltipProvider } from "@/components/ui/tooltip";
import { getCookieValue } from "@/lib/utils/server";
import { DOCS_STORE_KEY, type DocsState } from "@/store/docs-store";
import { MODELS_STORE_KEY, type ModelsStoreState } from "@/store/models-store";
import {
  NAVIGATION_STORE_KEY,
  type NavigationState,
} from "@/store/navigation-store";
import { ReactNode, use } from "react";
import { LanguageProvider } from "./app/language-provider";
import { ThemeProvider } from "./app/theme-provider";
import { UserProvider } from "./app/user-provider";
import { DocsProvider } from "./state/docs-provider";
import { JotaiProvider } from "./state/jotai-provider";
import { ModelsStoreProvider } from "./state/models-store-provider";
import { NavigationStoreProvider } from "./state/navigation-store-provider";
import { QueryProvider } from "./state/query-provider";

export function Providers(props: { children: ReactNode }) {
  const navigationStore = use(
    getCookieValue<NavigationState>(NAVIGATION_STORE_KEY),
  );
  const modelsStore = use(getCookieValue<ModelsStoreState>(MODELS_STORE_KEY));
  const docsStore = use(getCookieValue<DocsState>(DOCS_STORE_KEY));

  return (
    <QueryProvider>
      <JotaiProvider>
        <NavigationStoreProvider data={navigationStore}>
          <ModelsStoreProvider data={modelsStore}>
            <DocsProvider data={docsStore}>
              <UserProvider>
                <LanguageProvider>
                  <ThemeProvider>
                    <TooltipProvider>{props.children}</TooltipProvider>
                  </ThemeProvider>
                </LanguageProvider>
              </UserProvider>
            </DocsProvider>
          </ModelsStoreProvider>
        </NavigationStoreProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
