import { ReactNode } from "react";
import { JotaiProvider } from "./jotai-provider";
import { LanguageProvider } from "./language-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers(props: { children: ReactNode }) {
  return (
    <QueryProvider>
      <JotaiProvider>
        <LanguageProvider>
          <ThemeProvider>{props.children}</ThemeProvider>
        </LanguageProvider>
      </JotaiProvider>
    </QueryProvider>
  );
}
