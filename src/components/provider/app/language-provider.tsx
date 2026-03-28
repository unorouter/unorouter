import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";

export function LanguageProvider(props: { children: ReactNode }) {
  return <NextIntlClientProvider>{props.children}</NextIntlClientProvider>;
}
