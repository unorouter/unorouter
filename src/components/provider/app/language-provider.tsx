import { ClientIntlProvider } from "@/components/provider/app/client-intl-provider";
import { pruneClientMessages } from "@/i18n/client-messages";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";
import { ReactNode } from "react";

export async function LanguageProvider(props: { children: ReactNode }) {
  const [locale, timeZone, messages] = await Promise.all([
    getLocale(),
    getTimeZone(),
    getMessages(),
  ]);
  const pruned = pruneClientMessages(messages);

  return (
    <ClientIntlProvider locale={locale} timeZone={timeZone} messages={pruned}>
      {props.children}
    </ClientIntlProvider>
  );
}
