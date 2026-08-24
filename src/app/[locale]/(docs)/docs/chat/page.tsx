import { PageHeader } from "@/components/elements/content/page-header";
import {
  CHAT_DOC_SECTION_LABELS,
  CHAT_DOC_SECTION_ORDER,
  chatDocsBySection,
} from "@/components/pages/docs/chat/chat-docs";
import { chatDocKey } from "@/components/pages/docs/chat/chat-doc-template";
import { Icon } from "@/components/ui/icon";
import { Link, localeUrl } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "DOCS_CHAT.INDEX",
    href: "/docs/chat",
    badge: "chat",
  });
}

export default async function ChatDocsIndexPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations();
  const bySection = chatDocsBySection();
  const allDocs = CHAT_DOC_SECTION_ORDER.flatMap(
    (section) => bySection[section],
  );

  return (
    <>
      <JsonLd
        id="chat-docs-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.DOCS"), url: localeUrl(locale, "/docs") },
          {
            name: t("DOCS_CHAT.INDEX.TITLE", APP_VALUES),
            url: localeUrl(locale, "/docs/chat"),
          },
        ])}
      />
      <JsonLd
        id="chat-docs-collection"
        data={buildCollectionPageSchema({
          name: t("DOCS_CHAT.INDEX.META.TITLE", APP_VALUES),
          description: t("DOCS_CHAT.INDEX.META.DESCRIPTION", APP_VALUES),
          url: localeUrl(locale, "/docs/chat"),
          items: allDocs.map((doc) => ({
            name: t(chatDocKey(doc.i18nPrefix, "TITLE"), APP_VALUES),
            url: localeUrl(locale, doc.href),
            description: t(chatDocKey(doc.i18nPrefix, "SUBTITLE"), APP_VALUES),
          })),
        })}
      />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <PageHeader
          badge={t("DOCS_CHAT.COMMON.BADGE", APP_VALUES)}
          title={t("DOCS_CHAT.INDEX.TITLE", APP_VALUES)}
          subtitle={t("DOCS_CHAT.INDEX.SUBTITLE", APP_VALUES)}
          centered
        />
        {CHAT_DOC_SECTION_ORDER.map((section) => {
          const docs = bySection[section];
          if (docs.length === 0) return null;
          return (
            <section key={section} className="mt-12">
              <h2 className="mb-4 text-xl font-semibold">
                {t(CHAT_DOC_SECTION_LABELS[section])}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {docs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={doc.href}
                    className="border-border hover:bg-muted/50 group rounded-lg border p-4 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                        <Icon name={doc.iconName} className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground font-medium">
                          {t(chatDocKey(doc.i18nPrefix, "TITLE"), APP_VALUES)}
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {t(
                            chatDocKey(doc.i18nPrefix, "SUBTITLE"),
                            APP_VALUES,
                          )}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
