import { PageHeader } from "@/components/elements/content/page-header";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link, localeUrl } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/config/constants";
import type { LinkHref, Pathname } from "@/i18n/routing";
import type { IconName } from "@/lib/config/icon-map";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import type { TOCItemType } from "fumadocs-core/toc";
import { getTranslations } from "next-intl/server";

export function docKey(prefix: string, leaf: string): TranslationKey {
  return `${prefix}.${leaf}` as TranslationKey;
}

type DocEntry = {
  slug: string;
  href: Pathname;
  i18nPrefix: string;
  iconName: IconName;
  headings: readonly { id: string; i18nLeaf: string; level: number }[];
};

export async function DocIndexTemplate(props: {
  params: Promise<{ locale: string }>;
  namespace: string;
  href: Pathname;
  idPrefix: string;
  sections: { labelKey: TranslationKey; docs: readonly DocEntry[] }[];
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations();
  const allDocs = props.sections.flatMap((section) => section.docs);

  return (
    <>
      <JsonLd
        id={`${props.idPrefix}-breadcrumb`}
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.DOCS"), url: localeUrl(locale, "/docs") },
          {
            name: t(docKey(props.namespace, "INDEX.TITLE"), APP_VALUES),
            url: localeUrl(locale, props.href),
          },
        ])}
      />
      <JsonLd
        id={`${props.idPrefix}-collection`}
        data={buildCollectionPageSchema({
          name: t(docKey(props.namespace, "INDEX.META.TITLE"), APP_VALUES),
          description: t(
            docKey(props.namespace, "INDEX.META.DESCRIPTION"),
            APP_VALUES,
          ),
          url: localeUrl(locale, props.href),
          items: allDocs.map((doc) => ({
            name: t(docKey(doc.i18nPrefix, "TITLE"), APP_VALUES),
            url: localeUrl(locale, doc.href),
            description: t(docKey(doc.i18nPrefix, "SUBTITLE"), APP_VALUES),
          })),
        })}
      />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <PageHeader
          badge={t(docKey(props.namespace, "COMMON.BADGE"), APP_VALUES)}
          title={t(docKey(props.namespace, "INDEX.TITLE"), APP_VALUES)}
          subtitle={t(docKey(props.namespace, "INDEX.SUBTITLE"), APP_VALUES)}
          centered
        />
        {props.sections.map((section) => {
          if (section.docs.length === 0) return null;
          return (
            <section key={section.labelKey} className="mt-12">
              <h2 className="mb-4 text-xl font-semibold">
                {t(section.labelKey)}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.docs.map((doc) => (
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
                          {t(docKey(doc.i18nPrefix, "TITLE"), APP_VALUES)}
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {t(docKey(doc.i18nPrefix, "SUBTITLE"), APP_VALUES)}
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

export async function DocTemplate(props: {
  doc: DocEntry;
  docs: readonly DocEntry[];
  namespace: string;
  indexHref: LinkHref;
  children: React.ReactNode;
}) {
  const doc = props.doc;
  const t = await getTranslations();

  const tocItems: TOCItemType[] = doc.headings.map((heading) => ({
    title: t(docKey(doc.i18nPrefix, heading.i18nLeaf), APP_VALUES),
    url: `#${heading.id}`,
    depth: heading.level,
  }));
  const toc = createTOC(tocItems, t("DOCS.TOC_TITLE"));

  const idx = props.docs.findIndex((d) => d.slug === doc.slug);
  const prev = idx > 0 ? props.docs[idx - 1] : undefined;
  const next = idx < props.docs.length - 1 ? props.docs[idx + 1] : undefined;

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-6 flex justify-center">
          <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-2xl">
            <Icon name={doc.iconName} className="size-8" />
          </div>
        </div>
        <PageHeader
          badge={t(docKey(props.namespace, "COMMON.BADGE"), APP_VALUES)}
          title={t(docKey(doc.i18nPrefix, "TITLE"), APP_VALUES)}
          subtitle={t(docKey(doc.i18nPrefix, "SUBTITLE"), APP_VALUES)}
          centered
        />

        {props.children}

        <nav className="border-border mt-16 flex justify-between gap-3 border-t pt-8">
          {prev ? (
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={prev.href} />}
            >
              <Icon name="arrow-left" className="size-4" />
              {t(docKey(prev.i18nPrefix, "TITLE"), APP_VALUES)}
            </Button>
          ) : (
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={props.indexHref} />}
            >
              <Icon name="arrow-left" className="size-4" />
              {t(docKey(props.namespace, "INDEX.TITLE"), APP_VALUES)}
            </Button>
          )}
          {next ? (
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={next.href} />}
            >
              {t(docKey(next.i18nPrefix, "TITLE"), APP_VALUES)}
              <Icon name="arrow-right" className="size-4" />
            </Button>
          ) : null}
        </nav>
      </div>
    </TOCLayout>
  );
}
