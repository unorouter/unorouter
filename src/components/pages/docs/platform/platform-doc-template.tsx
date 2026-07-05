import { PageHeader } from "@/components/elements/content/page-header";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/config/constants";
import type { TOCItemType } from "fumadocs-core/toc";
import { getTranslations } from "next-intl/server";
import { PLATFORM_DOCS, type PlatformDoc } from "./platform-docs";

/** i18nPrefix is a runtime string; en.json carries the per-page leaf keys. */
export function platformDocKey(prefix: string, leaf: string): TranslationKey {
  return `${prefix}.${leaf}` as TranslationKey;
}

export async function PlatformDocTemplate(props: {
  doc: PlatformDoc;
  children: React.ReactNode;
}) {
  const doc = props.doc;
  const t = await getTranslations();

  const tocItems: TOCItemType[] = doc.headings.map((heading) => ({
    title: t(platformDocKey(doc.i18nPrefix, heading.i18nLeaf), APP_VALUES),
    url: `#${heading.id}`,
    depth: heading.level,
  }));
  const toc = createTOC(tocItems, t("DOCS.TOC_TITLE"));

  const idx = PLATFORM_DOCS.findIndex((d) => d.slug === doc.slug);
  const prev = idx > 0 ? PLATFORM_DOCS[idx - 1] : undefined;
  const next =
    idx < PLATFORM_DOCS.length - 1 ? PLATFORM_DOCS[idx + 1] : undefined;

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-6 flex justify-center">
          <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-2xl">
            <Icon name={doc.iconName} className="size-8" />
          </div>
        </div>
        <PageHeader
          badge={t("DOCS_PLATFORM.COMMON.BADGE", APP_VALUES)}
          title={t(platformDocKey(doc.i18nPrefix, "TITLE"), APP_VALUES)}
          subtitle={t(platformDocKey(doc.i18nPrefix, "SUBTITLE"), APP_VALUES)}
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
              {t(platformDocKey(prev.i18nPrefix, "TITLE"), APP_VALUES)}
            </Button>
          ) : (
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/docs/platform" />}
            >
              <Icon name="arrow-left" className="size-4" />
              {t("DOCS_PLATFORM.INDEX.TITLE", APP_VALUES)}
            </Button>
          )}
          {next ? (
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={next.href} />}
            >
              {t(platformDocKey(next.i18nPrefix, "TITLE"), APP_VALUES)}
              <Icon name="arrow-right" className="size-4" />
            </Button>
          ) : null}
        </nav>
      </div>
    </TOCLayout>
  );
}
