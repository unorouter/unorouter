import { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "./language-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { UserProvider } from "./user-provider";

export async function Providers(props: { children: ReactNode }) {
  return (
    <QueryProvider>
      <UserProvider>
        <LanguageProvider>
          <ThemeProvider>
            <TooltipProvider>{props.children}</TooltipProvider>
          </ThemeProvider>
        </LanguageProvider>
      </UserProvider>
    </QueryProvider>
  );
}
