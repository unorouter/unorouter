import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ReactNode } from "react";

// Heavy server-rendered content namespaces (docs guide bodies, blog posts,
// legal text) made the hydrated client messages ~190KB; stripping them cuts
// ~110KB from every page's RSC payload. Client components must not reference
// stripped keys (MISSING_MESSAGE in console if violated); the small DOCS/BLOG
// subtrees client components do use are kept below.
export async function LanguageProvider(props: { children: ReactNode }) {
  const messages = (await getMessages()) as Record<string, unknown>;
  const docs = (messages.DOCS ?? {}) as Record<string, unknown>;
  const blog = (messages.BLOG ?? {}) as Record<string, unknown>;

  const pruned: Record<string, unknown> = {
    ...messages,
    DOCS: {
      SETUP: docs.SETUP,
      CC_SWITCH: docs.CC_SWITCH,
      GENERATE_API_KEY: docs.GENERATE_API_KEY,
      GENERATE_API_KEY_DESC: docs.GENERATE_API_KEY_DESC,
    },
    BLOG: { ...blog },
  };
  delete (pruned.BLOG as Record<string, unknown>).POSTS;
  delete pruned.TERMS;
  delete pruned.PRIVACY;
  delete pruned.WELL_KNOWN;

  return (
    <NextIntlClientProvider
      messages={
        pruned as Parameters<typeof NextIntlClientProvider>[0]["messages"]
      }
    >
      {props.children}
    </NextIntlClientProvider>
  );
}
