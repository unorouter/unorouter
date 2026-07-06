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
import { fixedPriceUnitLabel } from "@/lib/api/model-modality";
import { APP_VALUES } from "@/lib/config/constants";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { modelHref } from "@/lib/utils/base";
import { discountPercent, formatPrice } from "@/lib/utils/format/number";
import { formatMsDate, formatYearMonth } from "@/lib/utils/format/date";
import { dayjs } from "@/lib/utils/format/date";
import { cn } from "@/lib/utils";
import { getDocsApiKey } from "@/lib/utils/server";
import { getLocale, getTranslations } from "next-intl/server";
import { AtCapacityBanner } from "./header/at-capacity-banner";
import { ModelDescription } from "./header/model-description";
import { ModelHeaderChips, ModelMetaStats } from "./header/model-header-chips";
import { CodeExamplesTabs } from "./tabs/code-examples-tabs";
import { GridPricingTable } from "./pricing/grid-pricing-table";
import { TieredPricing } from "./pricing/tiered-pricing";
import { hasAnyParameter, hasAnyQuickStat } from "./header/capability-helpers";
import { ModelBreadcrumb } from "./header/model-breadcrumb";
import { BenchmarksSection } from "./tabs/benchmarks-section";
import { ModelTabs } from "./tabs/model-tabs";
import { PerformanceSection } from "./tabs/performance-section";
import { QuickStats } from "./header/quick-stats";
import { SupportedParameters } from "./tabs/supported-parameters";
import { TryInChatButton } from "./header/try-in-chat-button";

interface ModelDetailProps {
  model: ProcessedModel;
  models: ProcessedModel[];
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
  const similar = findSimilarModels(props.models, m);

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

  const releaseDateLabel = m.metadata.releaseDate
    ? formatMsDate(dayjs(m.metadata.releaseDate).valueOf())
    : "";
  const lastUpdatedMs = m.createdTime
    ? m.createdTime * 1000
    : m.metadata.releaseDate
      ? dayjs(m.metadata.releaseDate).valueOf()
      : 0;
  const lastUpdatedLabel = lastUpdatedMs ? formatMsDate(lastUpdatedMs) : "";
  const knowledgeCutoff = formatYearMonth(m.metadata.knowledgeCutoff) ?? "";
  const hasReleaseRow = Boolean(
    releaseDateLabel || knowledgeCutoff || lastUpdatedLabel,
  );

  const endpointPills = m.endpointTypes ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 pt-20 pb-16">
      <ModelBreadcrumb
        vendorName={m.vendor.name}
        vendorHref={props.vendorHref}
        modelName={m.name}
      />
      <section className="pt-8 pb-6">
        {/* Mobile: chat action rides above the title so the name has full width. */}
        <div className="mb-4 flex sm:hidden">
          <TryInChatButton
            modelName={m.name}
            label={t("MODEL_PAGE.OPEN_CHAT")}
            loginLabel={t("MODEL_PAGE.OPEN_CHAT")}
            icon
            badge
            disabled={props.offline}
          />
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
              <h2
                className={cn(
                  "mb-3 font-mono text-[10px] tracking-widest uppercase",
                  theme.text,
                )}
              >
                {t("MODEL_PAGE.PRICING_TITLE")}
              </h2>
              {m.isTiered ? (
                <div className="overflow-hidden rounded-md border p-4">
                  <TieredPricing
                    model={m}
                    theme={theme}
                    groupRatioMap={props.groupRatioMap}
                  />
                </div>
              ) : (
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
              )}
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
            </section>

            {/* Capabilities + modalities live in the header chip row; here only
                the extra quick-stats the chips don't cover. */}
            {hasAnyQuickStat(m.metadata) && (
              <section className="mt-12">
                <h2
                  className={cn(
                    "mb-3 font-mono text-[10px] tracking-widest uppercase",
                    theme.text,
                  )}
                >
                  {t("MODELS.DETAIL.QUICK_STATS")}
                </h2>
                <QuickStats metadata={m.metadata} />
              </section>
            )}

            <section className="mt-12">
              <div className="mb-3 flex items-end justify-between gap-4">
                <h2
                  className={cn(
                    "font-mono text-[10px] tracking-widest uppercase",
                    theme.text,
                  )}
                >
                  {t("MODELS.DETAIL.PERFORMANCE")}
                </h2>
              </div>
              <PerformanceSection modelName={m.name} />
            </section>

            {hasAnyParameter(m.metadata) && (
              <section className="mt-12">
                <h2
                  className={cn(
                    "mb-3 font-mono text-[10px] tracking-widest uppercase",
                    theme.text,
                  )}
                >
                  {t("MODELS.DETAIL.SUPPORTED_PARAMETERS")}
                </h2>
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
              <h2
                className={cn(
                  "mb-3 font-mono text-[10px] tracking-widest uppercase",
                  theme.text,
                )}
              >
                {t("MODEL_PAGE.FAQ_TITLE")}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <FaqCard
                  question={
                    m.isFixedPrice
                      ? t("MODEL_PAGE.FAQ_COST_FIXED_Q", { name: m.name })
                      : m.isTiered
                        ? t("MODEL_PAGE.FAQ_COST_TIERED_Q", { name: m.name })
                        : m.gridPricing
                          ? t("MODEL_PAGE.FAQ_COST_GRID_Q", { name: m.name })
                          : t("MODEL_PAGE.FAQ_COST_Q", { name: m.name })
                  }
                  answer={
                    m.isFixedPrice
                      ? t("MODEL_PAGE.FAQ_COST_FIXED_A", {
                          name: m.name,
                          price: formatPrice(m.fixedPrice),
                        })
                      : m.isTiered
                        ? t("MODEL_PAGE.FAQ_COST_TIERED_A", { name: m.name })
                        : m.gridPricing
                          ? t("MODEL_PAGE.FAQ_COST_GRID_A", { name: m.name })
                          : t("MODEL_PAGE.FAQ_COST_A", {
                              name: m.name,
                              input: formatPrice(m.inputPrice),
                              output: formatPrice(m.outputPrice),
                            })
                  }
                  theme={theme}
                />
                <FaqCard
                  question={t("MODEL_PAGE.FAQ_API_Q", { name: m.name })}
                  answer={t("MODEL_PAGE.FAQ_API_A", {
                    ...APP_VALUES,
                    name: m.name,
                  })}
                  theme={theme}
                />
                {contextTag && (
                  <FaqCard
                    question={t("MODEL_PAGE.FAQ_CONTEXT_Q", { name: m.name })}
                    answer={t("MODEL_PAGE.FAQ_CONTEXT_A", {
                      name: m.name,
                      context: contextTag,
                    })}
                    theme={theme}
                  />
                )}
              </div>
            </section>

            {(similar.sameVendor.length > 0 || similar.sameTag.length > 0) && (
              <section className="mt-12">
                <h2
                  className={cn(
                    "mb-3 font-mono text-[10px] tracking-widest uppercase",
                    theme.text,
                  )}
                >
                  {t("MODEL_PAGE.SIMILAR_TITLE")}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[...similar.sameVendor, ...similar.sameTag].map((sim) => {
                    const simTheme = getVendorTheme(sim.vendor.name);
                    return (
                      <Link
                        key={sim.name}
                        href={modelHref(sim.name, sim.vendor.name)}
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
                            vendor={sim.vendor.icon ?? sim.vendor.name}
                            size={24}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{sim.name}</div>
                          <div
                            className={cn(
                              "truncate font-mono text-[10px] tracking-wider uppercase",
                              simTheme.text,
                            )}
                          >
                            {sim.vendor.name}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="border-border relative overflow-hidden rounded-2xl border">
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-60",
                  theme.bg.replace("/5", "/20"),
                )}
                aria-hidden
              />
              <div
                className={cn(
                  "pointer-events-none absolute -top-20 left-1/2 size-80 -translate-x-1/2 rounded-full blur-3xl",
                  theme.bg.replace("/5", "/30"),
                )}
                aria-hidden
              />
              <div className="relative px-6 py-14 text-center">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {t("MODEL_PAGE.CTA_TITLE", { name: m.name })}
                </h2>
                <p className="text-muted-foreground mx-auto mt-3 max-w-md">
                  {t("MODEL_PAGE.CTA_DESC")}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <TryInChatButton
                    modelName={m.name}
                    label={t("MODEL_PAGE.CTA_TRY", { name: m.name })}
                    loginLabel={t("MODEL_PAGE.CTA_SIGNUP", { name: m.name })}
                  />
                  <Button
                    nativeButton={false}
                    variant="outline"
                    render={<Link href="/models" />}
                  >
                    {t("MODEL_PAGE.CTA_ALL_MODELS")}
                  </Button>
                </div>
              </div>
            </section>
          </>
        }
        api={
          <>
            <section className="mt-12">
              <h2
                className={cn(
                  "mb-3 font-mono text-[10px] tracking-widest uppercase",
                  theme.text,
                )}
              >
                {t("MODEL_PAGE.BASE_URL")}
              </h2>
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
              <h2
                className={cn(
                  "mb-1 font-mono text-[10px] tracking-widest uppercase",
                  theme.text,
                )}
              >
                {t("MODEL_PAGE.CODE_TITLE", { name: m.name })}
              </h2>
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
              <h2
                className={cn(
                  "mb-3 font-mono text-[10px] tracking-widest uppercase",
                  theme.text,
                )}
              >
                {t("MODEL_PAGE.AVAILABLE_ENDPOINTS")}
              </h2>
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
            <BenchmarksSection
              modelName={m.name}
              vendorName={m.vendor.name}
            />
          </section>
        }
      />
    </div>
  );
}

type Theme = ReturnType<typeof getVendorTheme>;

// Compact price cell: label + big accent price + unit, with the pre-discount
// price struck through and a green "-N%" chip when the retail beats the sticker.
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
        <span className={cn("font-mono text-lg font-semibold", props.theme.text)}>
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

function FaqCard(props: { question: string; answer: string; theme: Theme }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5 backdrop-blur-sm",
        props.theme.border,
        props.theme.bg,
      )}
    >
      <h3 className="mb-2 font-medium">{props.question}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {props.answer}
      </p>
    </div>
  );
}
