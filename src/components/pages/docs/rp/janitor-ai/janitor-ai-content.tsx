import { APP_VALUES, msg } from "@/lib/config/constants";
import { PageHeader } from "@/components/elements/content/page-header";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import { highlightCode } from "@/components/elements/code/code-block";
import { Callout } from "@/components/elements/content/callout";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { GiBroom } from "react-icons/gi";
import { getDocsApiKey } from "@/lib/utils/server";

export async function JanitorAIContent() {
  const t = await getTranslations();
  const docs = await getDocsApiKey();

  const toc = createTOC(
    [
      { title: t("DOCS.JANITOR_AI.TOC_OVERVIEW"), url: "#overview", depth: 2 },
      {
        title: t("DOCS.JANITOR_AI.TOC_QUICK_CONFIG"),
        url: "#quick-config",
        depth: 2,
      },
      { title: t("DOCS.JANITOR_AI.TOC_STEPS"), url: "#steps", depth: 2 },
      {
        title: t("DOCS.JANITOR_AI.TOC_REFRESH_SAVE"),
        url: "#refresh-save",
        depth: 3,
      },
      {
        title: t("DOCS.JANITOR_AI.TOC_KEY_INVISIBILITY"),
        url: "#key-invisibility",
        depth: 3,
      },
      {
        title: t("DOCS.JANITOR_AI.TOC_TROUBLESHOOTING"),
        url: "#troubleshooting",
        depth: 2,
      },
    ],
    t("DOCS.TOC_TITLE"),
  );

  const steps = [
    {
      titleKey: msg("DOCS.JANITOR_AI.STEP_1_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.STEP_1_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.STEP_2_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.STEP_2_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.STEP_3_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.STEP_3_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.STEP_4_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.STEP_4_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.STEP_5_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.STEP_5_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.STEP_6_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.STEP_6_DESC"),
    },
  ];

  const troubles = [
    {
      titleKey: msg("DOCS.JANITOR_AI.TS_1_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.TS_1_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.TS_2_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.TS_2_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.TS_3_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.TS_3_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.TS_4_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.TS_4_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.TS_5_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.TS_5_DESC"),
    },
    {
      titleKey: msg("DOCS.JANITOR_AI.TS_6_TITLE"),
      descKey: msg("DOCS.JANITOR_AI.TS_6_DESC"),
    },
  ];

  const quickConfigCode = `${t("DOCS.JANITOR_AI.QUICK_CONFIG_URL_LABEL")}:   ${docs.apiUrl}/v1/chat/completions
${t("DOCS.JANITOR_AI.QUICK_CONFIG_KEY_LABEL")}:   ${docs.placeholder}
${t("DOCS.JANITOR_AI.QUICK_CONFIG_MODEL_LABEL")}: ${docs.topTextModel}`;

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS.JANITOR_AI.BADGE")}
          badgeIcon={GiBroom}
          title={t("DOCS.JANITOR_AI.TITLE")}
          subtitle={t("DOCS.JANITOR_AI.SUBTITLE", APP_VALUES)}
          centered
        />

        {/* Intro */}
        <Callout type="info" title={t("DOCS.JANITOR_AI.INTRO_TITLE")}>
          <p>{t("DOCS.JANITOR_AI.INTRO_DESC", APP_VALUES)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              <a
                href="https://help.janitorai.com/en/article/tldr-quickstart-proxy-instructions-1x0fptu/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {t("DOCS.JANITOR_AI.INTRO_LINK_DOCS")}
              </a>
            </li>
          </ul>
        </Callout>

        {/* Overview */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="overview">
            {t("DOCS.JANITOR_AI.OVERVIEW")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("DOCS.JANITOR_AI.OVERVIEW_DESC", APP_VALUES)}
          </p>
        </section>

        {/* Quick Config */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="quick-config">
            {t("DOCS.JANITOR_AI.QUICK_CONFIG")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.JANITOR_AI.QUICK_CONFIG_DESC")}
          </p>
          <ApiKeyCodeBlock
            html={await highlightCode(quickConfigCode, "text")}
            code={quickConfigCode}
            language="text"
            placeholder={docs.placeholder}
          />
          <p className="text-muted-foreground mt-3 text-sm">
            {t("DOCS.JANITOR_AI.QUICK_CONFIG_NOTE")}
          </p>
        </section>

        {/* Critical Refresh Warning */}
        <Callout type="warn" title={t("DOCS.JANITOR_AI.WARN_REFRESH_TITLE")}>
          <p>{t("DOCS.JANITOR_AI.WARN_REFRESH_DESC")}</p>
        </Callout>

        {/* Steps */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="steps">
            {t("DOCS.JANITOR_AI.STEPS")}
          </h2>
          <ol className="text-muted-foreground space-y-4 text-sm">
            {steps.map((step, idx) => (
              <li key={step.titleKey} className="flex gap-3">
                <span className="bg-muted text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs">
                  {idx + 1}
                </span>
                <div>
                  <strong className="text-foreground">
                    {t(step.titleKey)}
                  </strong>
                  <p className="mt-1">{t(step.descKey, APP_VALUES)}</p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="mt-8 mb-3 text-lg font-medium" id="refresh-save">
            {t("DOCS.JANITOR_AI.REFRESH_SAVE_TITLE")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("DOCS.JANITOR_AI.REFRESH_SAVE_DESC")}
          </p>

          <h3 className="mt-8 mb-3 text-lg font-medium" id="key-invisibility">
            {t("DOCS.JANITOR_AI.KEY_INVISIBILITY_TITLE")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("DOCS.JANITOR_AI.KEY_INVISIBILITY_DESC")}
          </p>
        </section>

        {/* Troubleshooting */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="troubleshooting">
            {t("DOCS.JANITOR_AI.TROUBLESHOOTING")}
          </h2>
          <ul className="text-muted-foreground space-y-3 text-sm">
            {troubles.map((item) => (
              <li key={item.titleKey}>
                <strong className="text-foreground">{t(item.titleKey)}</strong>{" "}
                {t(item.descKey, APP_VALUES)}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="border-border mt-16 border-t pt-12 text-center">
          <h2 className="text-2xl font-semibold">
            {t("DOCS.JANITOR_AI.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS.JANITOR_AI.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton
              translationKey="DOCS.JANITOR_AI.CTA_SIGNUP"
              authedTranslationKey="DOCS.JANITOR_AI.CTA_DASHBOARD"
            />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS.JANITOR_AI.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
