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
import { GiFox } from "react-icons/gi";
import { getDocsApiKey } from "@/lib/utils/server";

export async function RisuAIContent() {
  const t = await getTranslations();
  const docs = await getDocsApiKey();

  const toc = createTOC(
    [
      { title: t("DOCS.RISUAI.TOC_OVERVIEW"), url: "#overview", depth: 2 },
      { title: t("DOCS.RISUAI.TOC_QUICK_CONFIG"), url: "#quick-config", depth: 2 },
      { title: t("DOCS.RISUAI.TOC_STEPS"), url: "#steps", depth: 2 },
      { title: t("DOCS.RISUAI.TOC_AUTOFILL_WARNING"), url: "#autofill-warning", depth: 3 },
      { title: t("DOCS.RISUAI.TOC_AUX_MODEL"), url: "#aux-model", depth: 3 },
      { title: t("DOCS.RISUAI.TOC_TROUBLESHOOTING"), url: "#troubleshooting", depth: 2 },
    ],
    t("DOCS.TOC_TITLE"),
  );

  const steps = [
    { titleKey: msg("DOCS.RISUAI.STEP_1_TITLE"), descKey: msg("DOCS.RISUAI.STEP_1_DESC") },
    { titleKey: msg("DOCS.RISUAI.STEP_2_TITLE"), descKey: msg("DOCS.RISUAI.STEP_2_DESC") },
    { titleKey: msg("DOCS.RISUAI.STEP_3_TITLE"), descKey: msg("DOCS.RISUAI.STEP_3_DESC") },
    { titleKey: msg("DOCS.RISUAI.STEP_4_TITLE"), descKey: msg("DOCS.RISUAI.STEP_4_DESC") },
    { titleKey: msg("DOCS.RISUAI.STEP_5_TITLE"), descKey: msg("DOCS.RISUAI.STEP_5_DESC") },
    { titleKey: msg("DOCS.RISUAI.STEP_6_TITLE"), descKey: msg("DOCS.RISUAI.STEP_6_DESC") },
    { titleKey: msg("DOCS.RISUAI.STEP_7_TITLE"), descKey: msg("DOCS.RISUAI.STEP_7_DESC") },
    { titleKey: msg("DOCS.RISUAI.STEP_8_TITLE"), descKey: msg("DOCS.RISUAI.STEP_8_DESC") },
  ];

  const troubles = [
    { titleKey: msg("DOCS.RISUAI.TS_1_TITLE"), descKey: msg("DOCS.RISUAI.TS_1_DESC") },
    { titleKey: msg("DOCS.RISUAI.TS_2_TITLE"), descKey: msg("DOCS.RISUAI.TS_2_DESC") },
    { titleKey: msg("DOCS.RISUAI.TS_3_TITLE"), descKey: msg("DOCS.RISUAI.TS_3_DESC") },
    { titleKey: msg("DOCS.RISUAI.TS_4_TITLE"), descKey: msg("DOCS.RISUAI.TS_4_DESC") },
    { titleKey: msg("DOCS.RISUAI.TS_5_TITLE"), descKey: msg("DOCS.RISUAI.TS_5_DESC") },
    { titleKey: msg("DOCS.RISUAI.TS_6_TITLE"), descKey: msg("DOCS.RISUAI.TS_6_DESC") },
    { titleKey: msg("DOCS.RISUAI.TS_7_TITLE"), descKey: msg("DOCS.RISUAI.TS_7_DESC") },
  ];

  const quickConfigCode = `${t("DOCS.RISUAI.QUICK_CONFIG_URL_LABEL")}: ${docs.apiUrl}/v1/chat/completions
${t("DOCS.RISUAI.QUICK_CONFIG_KEY_LABEL")}:    ${docs.placeholder}
${t("DOCS.RISUAI.QUICK_CONFIG_MODEL_LABEL")}:   ${docs.topTextModel}`;

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS.RISUAI.BADGE")}
          badgeIcon={GiFox}
          title={t("DOCS.RISUAI.TITLE")}
          subtitle={t("DOCS.RISUAI.SUBTITLE", APP_VALUES)}
          centered
        />

        {/* Intro */}
        <Callout type="info" title={t("DOCS.RISUAI.INTRO_TITLE")}>
          <p>{t("DOCS.RISUAI.INTRO_DESC", APP_VALUES)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              <a
                href="https://docs.hyprlab.io/integration/basic-setup/risu-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {t("DOCS.RISUAI.INTRO_LINK_GUIDE")}
              </a>
            </li>
            <li>
              <a
                href="https://github.com/kwaroran/RisuAI"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {t("DOCS.RISUAI.INTRO_LINK_GITHUB")}
              </a>
            </li>
          </ul>
          <p className="mt-2 text-xs italic">
            {t("DOCS.RISUAI.INTRO_WIKI_NOTE")}
          </p>
        </Callout>

        {/* Overview */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="overview">
            {t("DOCS.RISUAI.OVERVIEW")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("DOCS.RISUAI.OVERVIEW_DESC", APP_VALUES)}
          </p>
        </section>

        {/* Critical Autofill Warning */}
        <Callout type="warn" title={t("DOCS.RISUAI.WARN_AUTOFILL_TITLE")}>
          <p>{t("DOCS.RISUAI.WARN_AUTOFILL_DESC")}</p>
        </Callout>

        {/* Quick Config */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="quick-config">
            {t("DOCS.RISUAI.QUICK_CONFIG")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.RISUAI.QUICK_CONFIG_DESC")}
          </p>
          <ApiKeyCodeBlock
            html={await highlightCode(quickConfigCode, "text")}
            code={quickConfigCode}
            language="text"
            placeholder={docs.placeholder}
          />
          <p className="text-muted-foreground mt-3 text-sm">
            {t("DOCS.RISUAI.QUICK_CONFIG_NOTE")}
          </p>
        </section>

        {/* Steps */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="steps">
            {t("DOCS.RISUAI.STEPS")}
          </h2>
          <ol className="text-muted-foreground space-y-4 text-sm">
            {steps.map((step, idx) => (
              <li key={step.titleKey} className="flex gap-3">
                <span className="bg-muted text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs">
                  {idx + 1}
                </span>
                <div>
                  <strong className="text-foreground">{t(step.titleKey)}</strong>
                  <p className="mt-1">{t(step.descKey, APP_VALUES)}</p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="mt-8 mb-3 text-lg font-medium" id="autofill-warning">
            {t("DOCS.RISUAI.AUTOFILL_WARNING_DETAIL_TITLE")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("DOCS.RISUAI.AUTOFILL_WARNING_DETAIL_DESC")}
          </p>

          <h3 className="mt-8 mb-3 text-lg font-medium" id="aux-model">
            {t("DOCS.RISUAI.AUX_MODEL_TITLE")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("DOCS.RISUAI.AUX_MODEL_DESC", APP_VALUES)}
          </p>
        </section>

        {/* Troubleshooting */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="troubleshooting">
            {t("DOCS.RISUAI.TROUBLESHOOTING")}
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
            {t("DOCS.RISUAI.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS.RISUAI.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton translationKey="DOCS.RISUAI.CTA_SIGNUP"
              authedTranslationKey="DOCS.RISUAI.CTA_DASHBOARD" />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS.RISUAI.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
