import { CCSwitchContent } from "@/components/pages/docs/cli/cc-switch/cc-switch-content";
import { ClaudeCodeContent } from "@/components/pages/docs/cli/claude-code/claude-code-content";
import { SetupGuideTemplate } from "@/components/pages/docs/setup-guide-template";
import {
  getSetupGuide,
  SETUP_GUIDES,
} from "@/components/pages/docs/setup-guides";
import type { Pathname } from "@/i18n/routing";
import { APP_VALUES, LOCALES } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/config/constants";
import { DocPageSchema } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import type { DocSlug } from "@/lib/types/seo";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { SetupGuide } from "@/components/pages/docs/setup-guides";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    SETUP_GUIDES.map((g) => ({ locale, slug: g.slug })),
  );
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const prefixKey = (prefix: string, leaf: string) =>
  `${prefix}.${leaf}` as TranslationKey;

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const guide = getSetupGuide(params.slug);
  if (!guide) return {};
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: guide.href as Pathname,
    title: t(prefixKey(guide.i18nPrefix, "META.TITLE"), APP_VALUES),
    description: t(prefixKey(guide.i18nPrefix, "META.DESCRIPTION"), APP_VALUES),
    keywords: t(prefixKey(guide.i18nPrefix, "META.KEYWORDS"), APP_VALUES),
    ogImage: ogBadge("banner", locale),
  });
}

function BespokeBody(props: { guide: SetupGuide }) {
  switch (props.guide.customComponent) {
    case "cc-switch":
      return <CCSwitchContent />;
    case "claude-code":
      return <ClaudeCodeContent />;
    default:
      return <SetupGuideTemplate guide={props.guide} />;
  }
}

export default async function SetupGuidePage(props: PageProps) {
  const params = await props.params;
  const guide = getSetupGuide(params.slug);
  if (!guide) notFound();
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug={`docs/${guide.slug}` as DocSlug}
        title={t(prefixKey(guide.i18nPrefix, "META.TITLE"), APP_VALUES)}
        description={t(
          prefixKey(guide.i18nPrefix, "META.DESCRIPTION"),
          APP_VALUES,
        )}
      />
      {guide.customComponent ? (
        <BespokeBody guide={guide} />
      ) : (
        <SetupGuideTemplate guide={guide} />
      )}
    </>
  );
}
