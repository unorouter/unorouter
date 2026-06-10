import { ClientIntlProvider } from "@/components/provider/app/client-intl-provider";
import { pruneClientMessages } from "@/i18n/client-messages";
import { getLocale, getMessages } from "next-intl/server";
import { ReactNode } from "react";

// Heavy server-rendered content namespaces (docs guide bodies, blog posts,
// legal text) made the hydrated client messages ~190KB; pruning them cuts
// ~110KB from every page's RSC payload. The pruning policy lives in
// src/i18n/client-messages.ts; ClientIntlProvider throws on MISSING_MESSAGE
// in dev so a client component referencing a pruned key fails loudly.
export async function LanguageProvider(props: { children: ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const pruned = pruneClientMessages(messages as Record<string, unknown>);

  return (
    <ClientIntlProvider
      locale={locale}
      messages={pruned as Parameters<typeof ClientIntlProvider>[0]["messages"]}
    >
      {props.children}
    </ClientIntlProvider>
  );
}
