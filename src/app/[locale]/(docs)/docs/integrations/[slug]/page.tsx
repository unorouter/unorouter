import { CCSwitchContent } from "@/components/pages/docs/cli/cc-switch/cc-switch-content";
import { ClaudeCodeContent } from "@/components/pages/docs/cli/claude-code/claude-code-content";
import { SetupGuideTemplate } from "@/components/pages/docs/setup-guide-template";
import { getSetupGuide } from "@/components/pages/docs/setup-guides";
import { APP_VALUES } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/config/constants";
import { DocPageSchema, JsonLd } from "@/lib/seo/json-ld";
import { buildHowToSchema } from "@/lib/seo/structured-data";
import { getPageMetadata, notFoundMetadata, ogBadge } from "@/lib/seo/metadata";
import type { DocSlug } from "@/lib/types";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const prefixKey = (prefix: string, leaf: string) =>
  `${prefix}.${leaf}` as TranslationKey;

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const guide = getSetupGuide(params.slug);
  if (!guide) return notFoundMetadata();
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: guide.href,
    title: t(prefixKey(guide.i18nPrefix, "META.TITLE"), APP_VALUES),
    description: t(prefixKey(guide.i18nPrefix, "META.DESCRIPTION"), APP_VALUES),
    keywords: t(prefixKey(guide.i18nPrefix, "META.KEYWORDS"), APP_VALUES),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function SetupGuidePage(props: PageProps) {
  const params = await props.params;
  const guide = getSetupGuide(params.slug);
  if (!guide) notFound();
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug={`docs/integrations/${guide.slug}` as DocSlug}
        title={t(prefixKey(guide.i18nPrefix, "META.TITLE"), APP_VALUES)}
        description={t(
          prefixKey(guide.i18nPrefix, "META.DESCRIPTION"),
          APP_VALUES,
        )}
      />
      {!guide.customComponent && guide.steps.length > 0 && (
        <JsonLd
          id={`${guide.slug}-howto`}
          data={buildHowToSchema(
            t(prefixKey(guide.i18nPrefix, "TITLE"), APP_VALUES),
            t(prefixKey(guide.i18nPrefix, "META.DESCRIPTION"), APP_VALUES),
            `/${params.locale}/docs/integrations/${guide.slug}`,
            guide.steps.map((step) => ({
              name: t(step.titleKey, APP_VALUES),
              text: t(step.bodyKey, APP_VALUES),
            })),
          )}
        />
      )}
      {guide.customComponent === "cc-switch" ? (
        <CCSwitchContent />
      ) : guide.customComponent === "claude-code" ? (
        <ClaudeCodeContent />
      ) : (
        <SetupGuideTemplate guide={guide} />
      )}
    </>
  );
}
