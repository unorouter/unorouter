import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { PageHeader } from "@/components/elements/content/page-header";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SETUP_GUIDES,
  type SetupCategory,
  type SetupGuide,
  setupGuidesByCategory,
} from "@/components/pages/docs/setup-guides";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import type { TranslationKey } from "@/lib/config/constants";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";

type PopularPath = {
  href: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
};

const POPULAR_PATHS: PopularPath[] = [
  {
    href: "#category-roleplay",
    titleKey: "DOCS_INDEX.PATH_ROLEPLAY_TITLE",
    descKey: "DOCS_INDEX.PATH_ROLEPLAY_DESC",
  },
  {
    href: "#category-coding",
    titleKey: "DOCS_INDEX.PATH_CODING_TITLE",
    descKey: "DOCS_INDEX.PATH_CODING_DESC",
  },
  {
    href: "#category-general",
    titleKey: "DOCS_INDEX.PATH_GENERAL_TITLE",
    descKey: "DOCS_INDEX.PATH_GENERAL_DESC",
  },
];

export async function DocsIndexContent() {
  const t = await getTranslations();
  const byCategory = setupGuidesByCategory();
  const orderedCategories = CATEGORY_ORDER.filter(
    (category) => byCategory[category].length > 0,
  );

  const toc = createTOC(
    [
      {
        title: t("DOCS_INDEX.PATHS_TITLE"),
        url: "#popular-paths",
        depth: 2,
      },
      ...orderedCategories.map((category) => ({
        title: t(CATEGORY_LABELS[category], APP_VALUES),
        url: `#category-${category}`,
        depth: 2,
      })),
      {
        title: t("DOCS_INDEX.FALLBACK_TITLE"),
        url: "#fallback",
        depth: 2,
      },
      {
        title: t("DOCS_INDEX.CTA_TITLE"),
        url: "#get-started",
        depth: 2,
      },
    ],
    t("DOCS.TOC_TITLE"),
  );

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS_INDEX.BADGE")}
          badgeIcon="book-open"
          title={t("DOCS_INDEX.TITLE")}
          subtitle={t("DOCS_INDEX.SUBTITLE", {
            ...APP_VALUES,
            count: SETUP_GUIDES.length,
          })}
          centered
          className="mb-12"
        />

        <section id="popular-paths">
          <h2 className="text-muted-foreground mb-1 font-mono text-xs tracking-widest uppercase">
            {t("DOCS_INDEX.PATHS_TITLE")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS_INDEX.PATHS_DESC")}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {POPULAR_PATHS.map((path) => (
              <a
                key={path.href}
                href={path.href}
                className="border-border bg-card/40 hover:border-primary/40 group flex flex-col gap-2 rounded-lg border p-5 backdrop-blur-sm transition-colors"
              >
                <strong className="text-foreground flex items-center gap-2 font-semibold">
                  {t(path.titleKey, APP_VALUES)}
                  <Icon
                    name="arrow-right"
                    className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors"
                  />
                </strong>
                <span className="text-muted-foreground text-sm leading-relaxed">
                  {t(path.descKey, APP_VALUES)}
                </span>
              </a>
            ))}
          </div>
        </section>

        {orderedCategories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            guides={byCategory[category]}
          />
        ))}

        <section id="fallback" className="border-border mt-20 border-t pt-12">
          <h2 className="text-muted-foreground mb-1 font-mono text-xs tracking-widest uppercase">
            {t("DOCS_INDEX.FALLBACK_EYEBROW")}
          </h2>
          <p className="text-2xl font-semibold">
            {t("DOCS_INDEX.FALLBACK_TITLE")}
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {t("DOCS_INDEX.FALLBACK_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS_INDEX.FALLBACK_MODELS")}
            </Button>
            {env.discordUrl ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={
                  <NextLink
                    href={env.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                {t("DOCS_INDEX.FALLBACK_DISCORD")}
              </Button>
            ) : null}
          </div>
        </section>

        <section className="border-border mt-20 border-t pt-12 text-center">
          <h2 className="text-2xl font-semibold" id="get-started">
            {t("DOCS_INDEX.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS_INDEX.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton
              translationKey="DOCS_INDEX.CTA_SIGNUP"
              authedTranslationKey="DOCS_INDEX.CTA_DASHBOARD"
            />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS_INDEX.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}

async function CategorySection(props: {
  category: SetupCategory;
  guides: SetupGuide[];
}) {
  const t = await getTranslations();
  const count = props.guides.length;

  return (
    <section id={`category-${props.category}`} className="mt-16">
      <header className="mb-4">
        <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          {t(CATEGORY_LABELS[props.category], APP_VALUES)}
        </span>
        <h2 className="mt-1 text-2xl font-semibold">
          {count === 1
            ? t("DOCS_INDEX.GUIDE_COUNT_ONE", { count })
            : t("DOCS_INDEX.GUIDE_COUNT_OTHER", { count })}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t(CATEGORY_DESCRIPTIONS[props.category])}
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {props.guides.map((guide) => (
          <Link
            key={guide.slug}
            id={guide.slug}
            href={guide.href}
            className="border-border bg-card/40 hover:border-primary/40 group flex flex-col gap-2 rounded-lg border p-5 backdrop-blur-sm transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className={`font-semibold ${guide.color.accent}`}>
                {t(guide.titleKey, APP_VALUES)}
              </h3>
              <Icon
                name="arrow-right"
                className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors"
              />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t(guide.subtitleKey, APP_VALUES)}
            </p>
            <span className="text-muted-foreground/70 mt-auto pt-2 font-mono text-[10px] tracking-wider uppercase">
              {t("DOCS_INDEX.VIEW_GUIDE")}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
