import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import { highlightCode } from "@/components/elements/code/code-block";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
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
import { formatPrice } from "@/lib/utils/format/number";
import { formatMsDate, formatYearMonth } from "@/lib/utils/format/date";
import { dayjs } from "@/lib/utils/format/date";
import { cn } from "@/lib/utils";
import { getDocsApiKey } from "@/lib/utils/server";
import { getLocale, getTranslations } from "next-intl/server";
import { AtCapacityBanner } from "./at-capacity-banner";
import { ModelDescription } from "./model-description";
import { ModelHeaderChips, ModelMetaStats } from "./model-header-chips";
import { CodeExamplesTabs } from "./code-examples-tabs";
import { GridPricingTable } from "./grid-pricing-table";
import { TieredPricing } from "./tiered-pricing";
import { hasAnyParameter, hasAnyQuickStat } from "./capability-helpers";
import { ModelBreadcrumb } from "./model-breadcrumb";
import { ModelTabs } from "./model-tabs";
import { PerformanceSection } from "./performance-section";
import { QuickStats } from "./quick-stats";
import { SupportedParameters } from "./supported-parameters";
import { TryInChatButton } from "./try-in-chat-button";

interface ModelDetailProps {
  model: ProcessedModel;
  models: ProcessedModel[];
  groupRatioMap: Record<string, number>;
  offline: boolean;
  vendorHref: string;
  tab: "overview" | "api";
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
        defaultTab={props.tab}
        overview={
          <>
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

            <section className="relative mt-16 mb-16">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <div
                    className={cn(
                      "mb-2 font-mono text-[10px] tracking-widest uppercase",
                      theme.text,
                    )}
                  >
                    § 01
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                    {t("MODEL_PAGE.PRICING_TITLE")}
                  </h2>
                </div>
                <p className="text-muted-foreground hidden max-w-sm text-right text-sm md:block">
                  {t("MODEL_PAGE.PRICING_DESC")}
                </p>
              </div>
              <div
                className={cn(
                  "overflow-hidden rounded-lg border backdrop-blur-sm",
                  theme.border,
                  theme.bg,
                )}
              >
                <Table>
                  <TableBody>
                    {m.isFixedPrice ? (
                      <TableRow>
                        <TableCell className="w-1/3 px-4 py-3 font-medium">
                          {t("MODEL_PAGE.FIXED_PRICE")}
                        </TableCell>
                        <TableCell
                          className={cn("px-4 py-3 font-mono", theme.text)}
                        >
                          {fixedPriceUnitLabel(m) === "second"
                            ? t("MODEL_PAGE.PRICE_PER_SECOND", {
                                price: formatPrice(m.fixedPrice),
                              })
                            : fixedPriceUnitLabel(m) === "image"
                              ? t("MODEL_PAGE.PRICE_PER_IMAGE", {
                                  price: formatPrice(m.fixedPrice),
                                })
                              : t("MODEL_PAGE.PRICE_PER_REQUEST", {
                                  price: formatPrice(m.fixedPrice),
                                })}
                        </TableCell>
                      </TableRow>
                    ) : m.isTiered ? (
                      <TableRow>
                        <TableCell className="w-1/3 px-4 py-3 align-top font-medium">
                          {t("MODELS.DETAIL.TIERED_PRICING")}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <TieredPricing
                            model={m}
                            theme={theme}
                            groupRatioMap={props.groupRatioMap}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        <TableRow>
                          <TableCell className="w-1/3 px-4 py-3 font-medium">
                            {t("MODEL_PAGE.INPUT_PRICE")}
                          </TableCell>
                          <TableCell
                            className={cn("px-4 py-3 font-mono", theme.text)}
                          >
                            {t("MODEL_PAGE.PRICE_PER_MILLION", {
                              price: formatPrice(m.inputPrice),
                            })}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="w-1/3 px-4 py-3 font-medium">
                            {t("MODEL_PAGE.OUTPUT_PRICE")}
                          </TableCell>
                          <TableCell
                            className={cn("px-4 py-3 font-mono", theme.text)}
                          >
                            {t("MODEL_PAGE.PRICE_PER_MILLION", {
                              price: formatPrice(m.outputPrice),
                            })}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                    {contextTag && (
                      <TableRow>
                        <TableCell className="w-1/3 px-4 py-3 font-medium">
                          {t("MODEL_PAGE.CONTEXT_WINDOW")}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono">
                          {t("MODEL_PAGE.CONTEXT_TOKENS", {
                            count: contextTag,
                          })}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="w-1/3 px-4 py-3 font-medium">
                        {t("MODEL_PAGE.ENDPOINTS")}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {endpointsDisplay}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="w-1/3 px-4 py-3 font-medium">
                        {t("MODEL_PAGE.VENDOR")}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {m.vendor.name}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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

            <section className="mb-16">
              <div className="mb-6">
                <div
                  className={cn(
                    "mb-2 font-mono text-[10px] tracking-widest uppercase",
                    theme.text,
                  )}
                >
                  § 03
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {t("MODEL_PAGE.FAQ_TITLE")}
                </h2>
              </div>
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
              <section className="mb-16">
                <div className="mb-6">
                  <div
                    className={cn(
                      "mb-2 font-mono text-[10px] tracking-widest uppercase",
                      theme.text,
                    )}
                  >
                    § 04
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                    {t("MODEL_PAGE.SIMILAR_TITLE")}
                  </h2>
                </div>
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
            <section className="mt-12 mb-16">
              <div className="mb-6">
                <div
                  className={cn(
                    "mb-2 font-mono text-[10px] tracking-widest uppercase",
                    theme.text,
                  )}
                >
                  § 01
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {t("MODEL_PAGE.BASE_URL")}
                </h2>
              </div>
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

            <section className="mb-16">
              <div className="mb-6">
                <div
                  className={cn(
                    "mb-2 font-mono text-[10px] tracking-widest uppercase",
                    theme.text,
                  )}
                >
                  § 02
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {t("MODEL_PAGE.CODE_TITLE", { name: m.name })}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  {t("MODEL_PAGE.CODE_DESC", APP_VALUES)}
                </p>
              </div>
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

            <section className="mb-16">
              <div className="mb-6">
                <div
                  className={cn(
                    "mb-2 font-mono text-[10px] tracking-widest uppercase",
                    theme.text,
                  )}
                >
                  § 03
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {t("MODEL_PAGE.AVAILABLE_ENDPOINTS")}
                </h2>
              </div>
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
      />
    </div>
  );
}

type Theme = ReturnType<typeof getVendorTheme>;

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
