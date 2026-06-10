import { ClientIntlProvider } from "@/components/provider/app/client-intl-provider";
import { pruneClientMessages } from "@/i18n/client-messages";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";
import { ReactNode } from "react";

// Pruning server-only content namespaces cuts ~110KB from every page's RSC
// payload. Policy in src/i18n/client-messages.ts; pruned-key references throw in dev.
export async function LanguageProvider(props: { children: ReactNode }) {
  const [locale, timeZone, messages] = await Promise.all([
    getLocale(),
    getTimeZone(),
    getMessages(),
  ]);
  const pruned = pruneClientMessages(messages as Record<string, unknown>);

  return (
    <ClientIntlProvider
      locale={locale}
      timeZone={timeZone}
      messages={pruned as Parameters<typeof ClientIntlProvider>[0]["messages"]}
    >
      {props.children}
    </ClientIntlProvider>
  );
}
