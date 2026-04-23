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
import { LuDrama } from "react-icons/lu";
import { getDocsApiKey } from "@/lib/utils/server";

export async function SillyTavernContent() {
  const t = await getTranslations();
  const docs = await getDocsApiKey();

  const toc = createTOC(
    [
      {
        title: t("DOCS.SILLYTAVERN.TOC_OVERVIEW"),
        url: "#overview",
        depth: 2,
      },
      {
        title: t("DOCS.SILLYTAVERN.TOC_QUICK_CONFIG"),
        url: "#quick-config",
        depth: 2,
      },
      {
        title: t("DOCS.SILLYTAVERN.TOC_STEPS"),
        url: "#steps",
        depth: 2,
      },
      {
        title: t("DOCS.SILLYTAVERN.TOC_MODELS_DROPDOWN"),
        url: "#models-dropdown",
        depth: 3,
      },
      {
        title: t("DOCS.SILLYTAVERN.TOC_TROUBLESHOOTING"),
        url: "#troubleshooting",
        depth: 2,
      },
    ],
    t("DOCS.TOC_TITLE"),
  );

  const steps = [
    {
      titleKey: msg("DOCS.SILLYTAVERN.STEP_1_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.STEP_1_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.STEP_2_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.STEP_2_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.STEP_3_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.STEP_3_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.STEP_4_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.STEP_4_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.STEP_5_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.STEP_5_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.STEP_6_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.STEP_6_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.STEP_7_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.STEP_7_DESC"),
    },
  ];

  const troubles = [
    {
      titleKey: msg("DOCS.SILLYTAVERN.TS_1_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.TS_1_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.TS_2_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.TS_2_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.TS_3_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.TS_3_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.TS_4_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.TS_4_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.TS_5_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.TS_5_DESC"),
    },
    {
      titleKey: msg("DOCS.SILLYTAVERN.TS_6_TITLE"),
      descKey: msg("DOCS.SILLYTAVERN.TS_6_DESC"),
    },
  ];

  const quickConfigCode = `${t("DOCS.SILLYTAVERN.QUICK_CONFIG_BASE_URL_LABEL")}: ${docs.apiUrl}/v1
${t("DOCS.SILLYTAVERN.QUICK_CONFIG_KEY_LABEL")}:  ${docs.placeholder}
${t("DOCS.SILLYTAVERN.QUICK_CONFIG_MODEL_LABEL")}:    ${docs.modelFor("OpenAI")}`;

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS.SILLYTAVERN.BADGE")}
          badgeIcon={LuDrama}
          title={t("DOCS.SILLYTAVERN.TITLE")}
          subtitle={t("DOCS.SILLYTAVERN.SUBTITLE", APP_VALUES)}
          centered
        />

        {/* Intro */}
        <Callout type="info" title={t("DOCS.SILLYTAVERN.INTRO_TITLE")}>
          <p>{t("DOCS.SILLYTAVERN.INTRO_DESC")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              <a
                href="https://docs.sillytavern.app/usage/api-connections/openai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {t("DOCS.SILLYTAVERN.INTRO_LINK_DOCS")}
              </a>
            </li>
            <li>
              <a
                href="https://github.com/SillyTavern/SillyTavern"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {t("DOCS.SILLYTAVERN.INTRO_LINK_GITHUB")}
              </a>
            </li>
          </ul>
        </Callout>

        {/* Overview */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="overview">
            {t("DOCS.SILLYTAVERN.OVERVIEW")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("DOCS.SILLYTAVERN.OVERVIEW_DESC", APP_VALUES)}
          </p>
        </section>

        {/* Quick Config */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="quick-config">
            {t("DOCS.SILLYTAVERN.QUICK_CONFIG")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.SILLYTAVERN.QUICK_CONFIG_DESC")}
          </p>
          <ApiKeyCodeBlock
            html={await highlightCode(quickConfigCode, "text")}
            code={quickConfigCode}
            language="text"
            placeholder={docs.placeholder}
          />
          <p className="text-muted-foreground mt-3 text-sm">
            {t("DOCS.SILLYTAVERN.QUICK_CONFIG_NOTE")}
          </p>
        </section>

        {/* Steps */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="steps">
            {t("DOCS.SILLYTAVERN.STEPS")}
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

          {/* Models dropdown sub-section */}
          <h3 className="mt-8 mb-3 text-lg font-medium" id="models-dropdown">
            {t("DOCS.SILLYTAVERN.MODELS_DROPDOWN_TITLE")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("DOCS.SILLYTAVERN.MODELS_DROPDOWN_DESC", APP_VALUES)}
          </p>
        </section>

        {/* Troubleshooting */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="troubleshooting">
            {t("DOCS.SILLYTAVERN.TROUBLESHOOTING")}
          </h2>
          <ul className="text-muted-foreground space-y-3 text-sm">
            {troubles.map((item) => (
              <li key={item.titleKey}>
                <strong className="text-foreground">
                  {t(item.titleKey)}
                </strong>
                {" "}
                {t(item.descKey, APP_VALUES)}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="border-border mt-16 border-t pt-12 text-center">
          <h2 className="text-2xl font-semibold">
            {t("DOCS.SILLYTAVERN.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS.SILLYTAVERN.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton translationKey="DOCS.SILLYTAVERN.CTA_SIGNUP" />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS.SILLYTAVERN.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
