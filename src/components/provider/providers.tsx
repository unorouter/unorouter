import { ReactNode, use } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCookieValue } from "@/lib/utils/server";
import {
  NAVIGATION_STORE_KEY,
  type NavigationState,
} from "@/store/navigation-store";
import { JotaiProvider } from "./jotai-provider";
import { LanguageProvider } from "./language-provider";
import { NavigationStoreProvider } from "./navigation-store-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { UserProvider } from "./user-provider";

export function Providers(props: { children: ReactNode }) {
  const navigationStore = use(
    getCookieValue<NavigationState>(NAVIGATION_STORE_KEY),
  );

  return (
    <QueryProvider>
      <JotaiProvider>
        <NavigationStoreProvider data={navigationStore}>
          <UserProvider>
            <LanguageProvider>
              <ThemeProvider>
                <TooltipProvider>{props.children}</TooltipProvider>
              </ThemeProvider>
            </LanguageProvider>
          </UserProvider>
        </NavigationStoreProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
