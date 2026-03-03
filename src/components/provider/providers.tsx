import { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { JotaiProvider } from "./jotai-provider";
import { LanguageProvider } from "./language-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers(props: { children: ReactNode }) {
  return (
    <QueryProvider>
      <JotaiProvider>
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>{props.children}</ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
