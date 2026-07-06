import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import { highlightCode } from "@/components/elements/code/code-block";
import { PageHeader } from "@/components/elements/content/page-header";
import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { OSTabs } from "@/components/pages/docs/os/os-tabs";
import { OSCodeBlock } from "@/components/pages/docs/os/os-code-block";
import { buildOSVariants } from "@/components/pages/docs/os/os-code-helpers";
import { GuideIcon } from "@/components/pages/docs/guide-icon";
import { Link } from "@/i18n/navigation";
import { getFreeTextModels } from "@/lib/api/pricing-cache";
import { APP_VALUES } from "@/lib/config/constants";
import { OS } from "@/lib/types/enums";
import { getDocsApiKey } from "@/lib/utils/server";
import type { TranslationKey } from "@/lib/config/constants";
import type { TOCItemType } from "fumadocs-core/toc";
import { getTranslations } from "next-intl/server";
import type { SetupCompatibility, SetupGuide } from "./setup-guides";

type CompatRow = { key: keyof SetupCompatibility; labelKey: TranslationKey };

function prefixKey(prefix: string, leaf: string): TranslationKey {
  return `${prefix}.${leaf}` as TranslationKey;
}

const COMPAT_ROWS: CompatRow[] = [
  {
    key: "chatCompletions",
    labelKey: "DOCS.SETUP_GUIDE.COMPAT_CHAT_COMPLETIONS",
  },
  { key: "messages", labelKey: "DOCS.SETUP_GUIDE.COMPAT_MESSAGES" },
  { key: "responses", labelKey: "DOCS.SETUP_GUIDE.COMPAT_RESPONSES" },
  { key: "streaming", labelKey: "DOCS.SETUP_GUIDE.COMPAT_STREAMING" },
  { key: "toolCalling", labelKey: "DOCS.SETUP_GUIDE.COMPAT_TOOL_CALLING" },
  { key: "images", labelKey: "DOCS.SETUP_GUIDE.COMPAT_IMAGES" },
];

export async function SetupGuideTemplate(props: { guide: SetupGuide }) {
  const guide = props.guide;
  const t = await getTranslations();
  const docs = await getDocsApiKey();
  const freeModels = await getFreeTextModels(5);
  const models = freeModels.length > 0 ? freeModels : guide.recommendedModels;

  const hasSteps = guide.steps.length > 0;
  const hasCompat = COMPAT_ROWS.some((row) => guide.compatibility[row.key]);
  const hasGotchas = (guide.gotchaKeys?.length ?? 0) > 0;

  const fullUrl = guide.apiPath
    ? `${guide.baseUrl}${guide.apiPath}`
    : guide.baseUrl;
  const quickConfigCode = `${t("DOCS.SETUP_GUIDE.BASE_URL_LABEL")}: ${fullUrl}
${t("DOCS.SETUP_GUIDE.API_KEY_LABEL")}: ${docs.placeholder}`;

  const hasOverview = t.has(prefixKey(guide.i18nPrefix, "OVERVIEW_DESC"));

  const tocItems: TOCItemType[] = [];
  if (hasOverview)
    tocItems.push({
      title: t("DOCS.SETUP_GUIDE.TOC_OVERVIEW"),
      url: "#overview",
      depth: 2,
    });
  tocItems.push({
    title: t("DOCS.SETUP_GUIDE.TOC_QUICK_CONFIG"),
    url: "#quick-config",
    depth: 2,
  });
  if (hasCompat)
    tocItems.push({
      title: t("DOCS.SETUP_GUIDE.TOC_COMPATIBILITY"),
      url: "#compatibility",
      depth: 2,
    });
  if (hasSteps) {
    tocItems.push({
      title: t("DOCS.SETUP_GUIDE.TOC_STEPS"),
      url: "#steps",
      depth: 2,
    });
    guide.steps.forEach((step, idx) =>
      tocItems.push({
        title: t(step.titleKey, APP_VALUES),
        url: `#step-${idx + 1}`,
        depth: 3,
      }),
    );
  }
  tocItems.push({
    title: t("DOCS.SETUP_GUIDE.TOC_MODELS"),
    url: "#models",
    depth: 2,
  });
  if (hasGotchas)
    tocItems.push({
      title: t("DOCS.SETUP_GUIDE.TOC_GOTCHAS"),
      url: "#gotchas",
      depth: 2,
    });

  const toc = createTOC(tocItems, t("DOCS.TOC_TITLE"));

  const osVariants = guide.quickStart
    ? await buildOSVariants({
        windows: { code: guide.quickStart[OS.WINDOWS], language: "powershell" },
        macos: { code: guide.quickStart[OS.MACOS], language: "bash" },
        linux: { code: guide.quickStart[OS.LINUX], language: "bash" },
      })
    : null;

  const stepCodeHtml = await Promise.all(
    guide.steps.map((step) =>
      step.code
        ? highlightCode(step.code.value, step.code.lang)
        : Promise.resolve(null),
    ),
  );

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div
              className={`absolute inset-0 ${guide.color.glow} rounded-full blur-xl`}
            />
            <GuideIcon
              iconKey={guide.iconKey}
              logoSrc={guide.logoSrc}
              logoBg={guide.logoBg}
              logoMono={guide.logoMono}
              accentClass={guide.color.accent}
              size={64}
            />
          </div>
        </div>
        <PageHeader
          badge={t(guide.badgeKey, APP_VALUES)}
          title={t(guide.titleKey, APP_VALUES)}
          subtitle={t(guide.subtitleKey, APP_VALUES)}
          color={
            guide.color.accent.startsWith("text-")
              ? undefined
              : guide.color.accent
          }
          centered
        />

        {/* Overview (only when the guide defines a description) */}
        {hasOverview && (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-semibold" id="overview">
              {t("DOCS.SETUP_GUIDE.OVERVIEW")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t(prefixKey(guide.i18nPrefix, "OVERVIEW_DESC"), APP_VALUES)}
            </p>
          </section>
        )}

        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="quick-config">
            {t("DOCS.SETUP_GUIDE.QUICK_CONFIG")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.SETUP_GUIDE.QUICK_CONFIG_DESC")}
          </p>
          <ApiKeyCodeBlock
            html={await highlightCode(quickConfigCode, "text")}
            code={quickConfigCode}
            language="text"
            placeholder={docs.placeholder}
          />
        </section>

        {hasCompat ? (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-semibold" id="compatibility">
              {t("DOCS.SETUP_GUIDE.COMPATIBILITY")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {COMPAT_ROWS.filter((row) => guide.compatibility[row.key]).map(
                (row) => (
                  <Badge key={row.key} variant="secondary">
                    {t(row.labelKey)}
                  </Badge>
                ),
              )}
            </div>
          </section>
        ) : null}

        {hasSteps ? (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-semibold" id="steps">
              {t("DOCS.SETUP_GUIDE.STEPS")}
            </h2>
            <ol className="text-muted-foreground space-y-6 text-sm">
              {guide.steps.map((step, idx) => (
                <li
                  key={step.titleKey}
                  id={`step-${idx + 1}`}
                  className="flex gap-3"
                >
                  <span className="bg-muted text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="text-foreground">
                      {t(step.titleKey, APP_VALUES)}
                    </strong>
                    <p className="mt-1">{t(step.bodyKey, APP_VALUES)}</p>
                    {step.code && stepCodeHtml[idx] ? (
                      <div className="mt-3">
                        <ApiKeyCodeBlock
                          html={stepCodeHtml[idx]!}
                          code={step.code.value}
                          language={step.code.lang}
                          placeholder={docs.placeholder}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>

            {/* CLI shell quickstart (OS tabs) when present */}
            {osVariants ? (
              <div className="mt-8">
                <OSCodeBlock
                  variants={osVariants}
                  placeholder={docs.placeholder}
                />
              </div>
            ) : null}
          </section>
        ) : osVariants ? (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-semibold" id="steps">
              {t("DOCS.SETUP_GUIDE.STEPS")}
            </h2>
            <OSTabs
              labels={{ windows: "Windows", macos: "macOS", linux: "Linux" }}
              windowsContent={
                <ApiKeyCodeBlock
                  html={osVariants[OS.WINDOWS].html}
                  code={osVariants[OS.WINDOWS].code}
                  language="powershell"
                  placeholder={docs.placeholder}
                />
              }
              macosContent={
                <ApiKeyCodeBlock
                  html={osVariants[OS.MACOS].html}
                  code={osVariants[OS.MACOS].code}
                  language="bash"
                  placeholder={docs.placeholder}
                />
              }
              linuxContent={
                <ApiKeyCodeBlock
                  html={osVariants[OS.LINUX].html}
                  code={osVariants[OS.LINUX].code}
                  language="bash"
                  placeholder={docs.placeholder}
                />
              }
            />
          </section>
        ) : null}

        {/* Recommended models (runtime free-model list) */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="models">
            {t("DOCS.SETUP_GUIDE.RECOMMENDED_MODELS")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.SETUP_GUIDE.RECOMMENDED_MODELS_DESC")}
          </p>
          <div className="flex flex-wrap gap-2">
            {models.map((model) => (
              <Badge key={model} variant="outline" className="font-mono">
                {model}
              </Badge>
            ))}
          </div>
        </section>

        {hasGotchas ? (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-semibold" id="gotchas">
              {t("DOCS.SETUP_GUIDE.GOTCHAS")}
            </h2>
            <ul className="text-muted-foreground space-y-3 text-sm">
              {guide.gotchaKeys!.map((key) => (
                <li key={key} className="flex gap-2">
                  <span className="text-foreground" aria-hidden>
                    !
                  </span>
                  <span>{t(key, APP_VALUES)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="border-border mt-16 border-t pt-12 text-center">
          <GetStartedButton
            translationKey="DOCS.GENERATE_API_KEY"
            authedTranslationKey="DOCS.GENERATE_API_KEY"
          />
          <Button
            nativeButton={false}
            variant="outline"
            className="ml-3"
            render={<Link href="/models" />}
          >
            {t("NAV.MODELS")}
          </Button>
        </section>
      </div>
    </TOCLayout>
  );
}
