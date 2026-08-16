import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import { highlightCode } from "@/components/elements/code/code-block";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import {
  findContextTag,
  findSimilarModels,
  type ProcessedModel,
} from "@/lib/api/pricing";
import type { PricingCatalogModel } from "@/openapi";
import { fixedPriceUnitLabel } from "@/lib/api/model-modality";
import { APP_VALUES } from "@/lib/config/constants";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { modelHref } from "@/lib/utils/base";
import { discountPercent, formatPrice } from "@/lib/utils/format/number";
import { formatMsDate, formatYearMonth } from "@/lib/utils/format/date";
import { cn } from "@/lib/utils";
import { getDocsApiKey } from "@/lib/api/page-data";
import { getLocale, getTranslations } from "next-intl/server";
import { AtCapacityBanner } from "./header/at-capacity-banner";
import { ModelDescription } from "./header/model-description";
import { ModelFaq } from "./header/model-faq";
import { ModelHeaderChips, ModelMetaStats } from "./header/model-header-chips";
import { CodeExamplesTabs } from "./tabs/code-examples-tabs";
import { GridPricingTable } from "./pricing/grid-pricing-table";
import { GroupPricingSection } from "./pricing/group-pricing-section";
import { hasAnyParameter } from "./header/capability-helpers";
import { ModelBreadcrumb } from "./header/model-breadcrumb";
import { BenchmarksSection } from "./tabs/benchmarks-section";
import { SectionHeading } from "./shared/section-heading";
import { ModelRankingSection } from "./tabs/model-ranking-section";
import { ModelTabs } from "./tabs/model-tabs";
import { PerfUptimePanel } from "./tabs/perf-uptime-panel";
import { SupportedParameters } from "./tabs/supported-parameters";
import { TryInChatButton } from "./header/try-in-chat-button";
import { WatchModelButton } from "./header/watch-model-button";

interface ModelDetailProps {
  model: ProcessedModel;
  // Only for the similar-models lookup, which compares vendor id and tags.
  models: PricingCatalogModel[];
  groupRatioMap: Record<string, number>;
  offline: boolean;
  vendorHref: string;
}

export async function ModelDetail(props: ModelDetailProps) {
  const m = props.model;
  const t = await getTranslations();
  const locale = await getLocale();
  const docs = await getDocsApiKey();
  const contextTag = findContextTag(m);
  const similar = findSimilarModels(props.models, {
    model_name: m.name,
    vendor_id: m.vendor.id,
    tags: m.tags,
  });

  const curlExample = `curl ${docs.apiUrl}/v1/chat/completions \\
  -H "Authorization: Bearer ${docs.placeholder}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.name}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  const tsExample = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${docs.apiUrl}/v1",
  apiKey: "${docs.placeholder}",
});

const res = await client.chat.completions.create({
  model: "${m.name}",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(res.choices[0].message.content);`;

  const pyExample = `from openai import OpenAI

client = OpenAI(
    base_url="${docs.apiUrl}/v1",
    api_key="${docs.placeholder}",
)

res = client.chat.completions.create(
    model="${m.name}",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(res.choices[0].message.content)`;

  const [curlHtml, tsHtml, pyHtml] = await Promise.all([
    highlightCode(curlExample, "bash"),
    highlightCode(tsExample, "typescript"),
    highlightCode(pyExample, "python"),
  ]);

  const theme = getVendorTheme(m.vendor.name);
  const endpointsDisplay = (m.endpointTypes ?? []).join(", ") || "-";

  const released = m.metadata.releaseTs;
  const releaseDateLabel = released ? formatMsDate(released) : "";
  const lastUpdatedMs = m.createdTime ? m.createdTime * 1000 : released;
  const lastUpdatedLabel = lastUpdatedMs ? formatMsDate(lastUpdatedMs) : "";
  const knowledgeCutoff = formatYearMonth(m.metadata.knowledgeCutoff) ?? "";
  const hasReleaseRow = Boolean(
    releaseDateLabel || knowledgeCutoff || lastUpdatedLabel,
  );

  const endpointPills = m.endpointTypes ?? [];

  const glow = theme.primary ?? "#94a3b8";

  return (
    <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-16">
      {/* Full-bleed vendor-tinted glow at the top, matching the rankings/tester
          pages. Escapes the max-w container via w-screen + centered translate. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -z-10 h-150 w-screen -translate-x-1/2 opacity-25 dark:opacity-[0.12]"
        style={{
          background: [
            `radial-gradient(ellipse 45% 45% at 20% 12%, color-mix(in oklab, ${glow} 80%, transparent) 0%, transparent 70%)`,
            `radial-gradient(ellipse 40% 40% at 78% 10%, color-mix(in oklab, ${glow} 55%, transparent) 0%, transparent 70%)`,
            `radial-gradient(ellipse 35% 35% at 50% 50%, color-mix(in oklab, ${glow} 35%, transparent) 0%, transparent 70%)`,
          ].join(", "),
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      />
      <ModelBreadcrumb
        vendorName={m.vendor.name}
        vendorHref={props.vendorHref}
        modelName={m.name}
      />
      <section className="pt-8 pb-6">
        {/* Mobile: chat action rides above the title so the name has full width. */}
        <div className="mb-4 flex gap-2 sm:hidden">
          <TryInChatButton
            modelName={m.name}
            label={t("MODEL_PAGE.OPEN_CHAT")}
            loginLabel={t("MODEL_PAGE.OPEN_CHAT")}
            icon
            badge
            disabled={props.offline}
          />
          <WatchModelButton modelName={m.name} />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl border",
                theme.bg,
                theme.border,
              )}
            >
              <VendorIcon vendor={m.vendor.icon ?? m.vendor.name} size={28} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight wrap-break-word sm:text-3xl">
                <span className={cn("font-normal", theme.text)}>
                  {m.vendor.name}
                </span>
                <span className="text-muted-foreground">: </span>
                {m.name}
              </h1>
              <div className="text-muted-foreground mt-1 font-mono text-xs break-all">
                {m.name}
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <TryInChatButton
              modelName={m.name}
              label={t("MODEL_PAGE.OPEN_CHAT")}
              loginLabel={t("MODEL_PAGE.OPEN_CHAT")}
              icon
              badge
              disabled={props.offline}
            />
            <WatchModelButton modelName={m.name} />
          </div>
        </div>

        <div className="mt-4">
          <ModelHeaderChips metadata={m.metadata} locale={locale} />
        </div>

        {hasReleaseRow && (
          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs">
            {releaseDateLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" className="h-3 w-3" />
                {t("MODEL_PAGE.RELEASE_DATE")} {releaseDateLabel}
              </span>
            )}
            {knowledgeCutoff && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" className="h-3 w-3" />
                {t("MODEL_PAGE.KNOWLEDGE_CUTOFF")} {knowledgeCutoff}
              </span>
            )}
            {lastUpdatedLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="refresh-cw" className="h-3 w-3" />
                {t("MODEL_PAGE.LAST_UPDATED")} {lastUpdatedLabel}
              </span>
            )}
          </div>
        )}

        {m.description && (
          <div className="mt-4">
            <ModelDescription text={m.description} />
          </div>
        )}

        <div className="mt-4">
          <ModelMetaStats metadata={m.metadata} />
        </div>

        {props.offline && <AtCapacityBanner />}
      </section>

      <ModelTabs
        overview={
          <>
            <section className="mt-12">
              <SectionHeading theme={theme}>
                {t("MODEL_PAGE.PRICING_TITLE")}
              </SectionHeading>
              <div className="flex flex-wrap items-stretch gap-2">
                {m.isFixedPrice ? (
                  <PriceCell
                    label={t("MODEL_PAGE.FIXED_PRICE")}
                    value={m.fixedPrice}
                    original={m.originalFixedPrice}
                    unit={
                      fixedPriceUnitLabel(m) === "second"
                        ? t("MODEL_PAGE.PER_SECOND_UNIT")
                        : fixedPriceUnitLabel(m) === "image"
                          ? t("MODEL_PAGE.PER_IMAGE_UNIT")
                          : t("MODEL_PAGE.PER_REQUEST_UNIT")
                    }
                    offLabel={(pct) => t("MODELS.TABLE.OFF", { pct })}
                    theme={theme}
                  />
                ) : (
                  <>
                    <PriceCell
                      label={t("MODEL_PAGE.INPUT_PRICE")}
                      value={m.inputPrice}
                      original={m.originalInputPrice}
                      unit={t("MODEL_PAGE.PER_MILLION_UNIT")}
                      offLabel={(pct) => t("MODELS.TABLE.OFF", { pct })}
                      theme={theme}
                    />
                    <PriceCell
                      label={t("MODEL_PAGE.OUTPUT_PRICE")}
                      value={m.outputPrice}
                      original={m.originalOutputPrice}
                      unit={t("MODEL_PAGE.PER_MILLION_UNIT")}
                      offLabel={(pct) => t("MODELS.TABLE.OFF", { pct })}
                      theme={theme}
                    />
                  </>
                )}
              </div>
              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
                {contextTag && (
                  <span>
                    {t("MODEL_PAGE.CONTEXT_WINDOW")}{" "}
                    <span className="text-foreground/80">
                      {t("MODEL_PAGE.CONTEXT_TOKENS", { count: contextTag })}
                    </span>
                  </span>
                )}
                <span>
                  {t("MODEL_PAGE.ENDPOINTS")}{" "}
                  <span className="text-foreground/80">{endpointsDisplay}</span>
                </span>
                <span>
                  {t("MODEL_PAGE.VENDOR")}{" "}
                  <span className="text-foreground/80">{m.vendor.name}</span>
                </span>
              </div>
              {m.gridPricing && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold">
                    {t("MODEL_PAGE.GRID_PRICING_TITLE")}
                  </h3>
                  <GridPricingTable
                    rows={m.gridPricing}
                    priceLabel={t("MODEL_PAGE.GRID_PRICE_HEADER")}
                    multiplier={m.gridMinRatio}
                  />
                </div>
              )}
              {m.enableGroups.length > 0 && !m.isTiered && (
                <GroupPricingSection
                  model={m}
                  groupRatioMap={props.groupRatioMap}
                  theme={theme}
                />
              )}
            </section>

            <PerfUptimePanel modelName={m.name} theme={theme} />

            <section className="mt-12">
              <ModelRankingSection
                modelName={m.name}
                vendorName={m.vendor.name}
              />
            </section>

            {hasAnyParameter(m.metadata) && (
              <section className="mt-12">
                <SectionHeading theme={theme}>
                  {t("MODELS.DETAIL.SUPPORTED_PARAMETERS")}
                </SectionHeading>
                <div
                  className={cn(
                    "overflow-hidden rounded-lg border",
                    theme.border,
                    theme.bg,
                  )}
                >
                  <SupportedParameters metadata={m.metadata} />
                </div>
              </section>
            )}

            <section className="mt-12">
              <ModelFaq model={m} />
            </section>

            {(similar.sameVendor.length > 0 || similar.sameTag.length > 0) && (
              <section className="mt-12">
                <SectionHeading theme={theme}>
                  {t("MODEL_PAGE.SIMILAR_TITLE")}
                </SectionHeading>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[...similar.sameVendor, ...similar.sameTag].map((sim) => {
                    const simTheme = getVendorTheme(sim.vendor);
                    return (
                      <Link
                        key={sim.model_name}
                        href={modelHref(sim.model_name, sim.vendor)}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg border p-4 transition-all hover:-translate-y-0.5",
                          simTheme.bg,
                          simTheme.border,
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-md border",
                            simTheme.tagBg,
                            simTheme.tagBorder,
                          )}
                        >
                          <VendorIcon
                            vendor={sim.icon ?? sim.vendor}
                            size={24}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {sim.model_name}
                          </div>
                          <div
                            className={cn(
                              "truncate font-mono text-[10px] tracking-wider uppercase",
                              simTheme.text,
                            )}
                          >
                            {sim.vendor}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        }
        api={
          <>
            <section className="mt-12">
              <SectionHeading theme={theme}>
                {t("MODEL_PAGE.BASE_URL")}
              </SectionHeading>
              <div
                className={cn(
                  "flex items-center gap-2 overflow-x-auto rounded-lg border px-4 py-3 font-mono text-sm",
                  theme.border,
                  theme.bg,
                )}
              >
                <Icon
                  name="link"
                  className={cn("h-4 w-4 shrink-0", theme.text)}
                />
                <code className="whitespace-nowrap">{`${docs.apiUrl}/v1`}</code>
              </div>
            </section>

            <section className="mt-12">
              <SectionHeading theme={theme} className="mb-1">
                {t("MODEL_PAGE.CODE_TITLE", { name: m.name })}
              </SectionHeading>
              <p className="text-muted-foreground mb-3 text-sm">
                {t("MODEL_PAGE.CODE_DESC", APP_VALUES)}
              </p>
              <CodeExamplesTabs
                curl={
                  <ApiKeyCodeBlock
                    html={curlHtml}
                    code={curlExample}
                    language="bash"
                    placeholder={docs.placeholder}
                  />
                }
                typescript={
                  <ApiKeyCodeBlock
                    html={tsHtml}
                    code={tsExample}
                    language="typescript"
                    placeholder={docs.placeholder}
                  />
                }
                python={
                  <ApiKeyCodeBlock
                    html={pyHtml}
                    code={pyExample}
                    language="python"
                    placeholder={docs.placeholder}
                  />
                }
              />
            </section>

            <section className="mt-12">
              <SectionHeading theme={theme}>
                {t("MODEL_PAGE.AVAILABLE_ENDPOINTS")}
              </SectionHeading>
              {endpointPills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {endpointPills.map((ep) => (
                    <Badge
                      key={ep}
                      variant="outline"
                      className={cn(
                        "font-mono text-xs",
                        theme.tagBg,
                        theme.tagBorder,
                        theme.text,
                      )}
                    >
                      {ep}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground font-mono text-sm">
                  {endpointsDisplay}
                </span>
              )}
              <div className="mt-8">
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<Link href="/docs" />}
                >
                  <Icon name="file-text" className="h-4 w-4" />
                  {t("MODEL_PAGE.VIEW_DOCS")}
                </Button>
              </div>
            </section>
          </>
        }
        benchmarks={
          <section className="mt-12">
            <BenchmarksSection modelName={m.name} vendorName={m.vendor.name} />
          </section>
        }
      />
    </div>
  );
}

type Theme = ReturnType<typeof getVendorTheme>;

function PriceCell(props: {
  label: string;
  value: number;
  original: number | null;
  unit: string;
  offLabel: (pct: number) => string;
  theme: Theme;
}) {
  const pct = discountPercent(props.value, props.original);
  return (
    <div className="border-border bg-muted/20 min-w-36 flex-1 rounded-md border px-3 py-2.5">
      <div className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
        {props.label}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span
          className={cn("font-mono text-lg font-semibold", props.theme.text)}
        >
          {formatPrice(props.value)}
        </span>
        <span className="text-muted-foreground font-mono text-[11px]">
          {props.unit}
        </span>
        {pct > 0 && props.original !== null && (
          <>
            <span className="text-muted-foreground/50 font-mono text-[11px] line-through">
              {formatPrice(props.original)}
            </span>
            <span className="rounded bg-green-500/15 px-1 font-mono text-[10px] text-green-600 dark:text-green-400">
              {props.offLabel(pct)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
