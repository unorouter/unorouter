import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import { highlightCode } from "@/components/elements/code/code-block";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { ScrambleText } from "@/components/elements/fx/scramble-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import {
  findContextTag,
  findSimilarModels,
  type ProcessedModel,
} from "@/lib/api/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { formatPrice } from "@/lib/utils/base";
import { cn } from "@/lib/utils";
import { getDocsApiKey } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { CodeExamplesTabs } from "./code-examples-tabs";
import { GridPricingTable } from "./grid-pricing-table";
import { CapabilityChips } from "./sections/capability-chips";
import {
  hasAnyCapability,
  hasAnyParameter,
  hasAnyQuickStat,
} from "./sections/capability-helpers";
import { ModalitiesRow } from "./sections/modalities-row";
import { PerformanceSection } from "./sections/performance-section";
import { QuickStats } from "./sections/quick-stats";
import { SupportedParameters } from "./sections/supported-parameters";
import { TryInChatButton } from "./try-in-chat-button";

interface ModelDetailProps {
  model: ProcessedModel;
  models: ProcessedModel[];
}

export async function ModelDetail(props: ModelDetailProps) {
  const m = props.model;
  const t = await getTranslations();
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
  const endpointsDisplay = (m.endpointTypes ?? []).join(", ") || "—";
  const typeLabel = m.type.charAt(0).toUpperCase() + m.type.slice(1);

  const stats: {
    label: string;
    value: string;
    suffix?: string;
    mono?: boolean;
  }[] = [];

  if (m.isFixedPrice) {
    stats.push({
      label: t("MODEL_PAGE.STAT_FIXED"),
      value: m.isFree ? t("MODEL_PAGE.STAT_FREE") : formatPrice(m.fixedPrice),
    });
  } else {
    stats.push(
      {
        label: t("MODEL_PAGE.STAT_INPUT"),
        value:
          m.inputPrice === 0
            ? t("MODEL_PAGE.STAT_FREE")
            : formatPrice(m.inputPrice),
        suffix: m.inputPrice === 0 ? undefined : "/ 1M",
      },
      {
        label: t("MODEL_PAGE.STAT_OUTPUT"),
        value:
          m.outputPrice === 0
            ? t("MODEL_PAGE.STAT_FREE")
            : formatPrice(m.outputPrice),
        suffix: m.outputPrice === 0 ? undefined : "/ 1M",
      },
    );
  }

  if (m.type === "text" && contextTag) {
    stats.push({
      label: t("MODEL_PAGE.STAT_CONTEXT"),
      value: contextTag,
    });
  } else if (m.type !== "text") {
    stats.push({
      label: t("MODEL_PAGE.STAT_TYPE"),
      value: typeLabel,
    });
  }

  stats.push({
    label: t("MODEL_PAGE.STAT_ENDPOINTS"),
    value: endpointsDisplay,
    mono: true,
  });

  const statsColsClass =
    stats.length === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : stats.length === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-2 md:grid-cols-4";

  return (
    <div className="mx-auto max-w-5xl px-6 pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl",
            theme.bg.replace("/5", "/30"),
          )}
          aria-hidden
        />
        <div className="relative flex flex-col items-center pt-20 pb-16 text-center">
          <div
            className={cn(
              "mb-6 inline-flex items-center gap-2 rounded-sm border px-3 py-1.5",
              theme.tagBorder,
              theme.tagBg,
            )}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
            </span>
            <span
              className={cn(
                "font-mono text-[10px] tracking-[0.2em] uppercase",
                theme.text,
              )}
            >
              {t("MODEL_PAGE.AVAILABLE_BADGE")}
            </span>
          </div>

          <div
            className={cn(
              "mb-8 flex size-24 items-center justify-center rounded-2xl border",
              theme.bg,
              theme.border,
            )}
          >
            <VendorIcon vendor={m.vendor.icon ?? m.vendor.name} size={56} />
          </div>

          <div
            className={cn(
              "mb-2 font-mono text-xs tracking-widest uppercase",
              theme.text,
            )}
          >
            {m.vendor.name}
          </div>
          <h1 className="text-foreground mb-4 text-4xl font-bold tracking-tighter break-all sm:text-5xl md:text-6xl">
            <ScrambleText text={m.name} />
          </h1>
          {m.description && (
            <p className="text-muted-foreground max-w-2xl text-[15px] leading-relaxed">
              {m.description}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {(m.tags ?? []).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={cn(theme.tagBg, theme.tagBorder, theme.text)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section
        className={cn(
          "border-border divide-border grid gap-0 divide-y border-y sm:divide-x sm:divide-y-0",
          statsColsClass,
        )}
      >
        {stats.map((s) => (
          <StatCell
            key={s.label}
            label={s.label}
            value={s.value}
            suffix={s.suffix}
            mono={s.mono}
            theme={theme}
          />
        ))}
      </section>

      {/* Metadata sections (real model.metadata only) */}
      {(hasAnyCapability(m.metadata) ||
        (m.metadata.inputModalities ?? []).length > 0 ||
        (m.metadata.outputModalities ?? []).length > 0 ||
        hasAnyQuickStat(m.metadata)) && (
        <section className="mt-12 grid gap-6">
          {hasAnyCapability(m.metadata) && (
            <div>
              <h3
                className={cn(
                  "mb-3 font-mono text-[10px] tracking-widest uppercase",
                  theme.text,
                )}
              >
                {t("MODELS.DETAIL.CAPABILITIES")}
              </h3>
              <CapabilityChips metadata={m.metadata} variant="drawer" />
            </div>
          )}
          {((m.metadata.inputModalities ?? []).length > 0 ||
            (m.metadata.outputModalities ?? []).length > 0) && (
            <div>
              <h3
                className={cn(
                  "mb-3 font-mono text-[10px] tracking-widest uppercase",
                  theme.text,
                )}
              >
                {t("MODELS.DETAIL.MODALITIES")}
              </h3>
              <ModalitiesRow metadata={m.metadata} />
            </div>
          )}
          {hasAnyQuickStat(m.metadata) && (
            <div>
              <h3
                className={cn(
                  "mb-3 font-mono text-[10px] tracking-widest uppercase",
                  theme.text,
                )}
              >
                {t("MODELS.DETAIL.QUICK_STATS")}
              </h3>
              <QuickStats metadata={m.metadata} />
            </div>
          )}
        </section>
      )}

      {/* Performance */}
      <section className="mt-12">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h3
            className={cn(
              "font-mono text-[10px] tracking-widest uppercase",
              theme.text,
            )}
          >
            {t("MODELS.DETAIL.PERFORMANCE")}
          </h3>
        </div>
        <PerformanceSection modelName={m.name} />
      </section>

      {/* Supported parameters */}
      {hasAnyParameter(m.metadata) && (
        <section className="mt-12">
          <h3
            className={cn(
              "mb-3 font-mono text-[10px] tracking-widest uppercase",
              theme.text,
            )}
          >
            {t("MODELS.DETAIL.SUPPORTED_PARAMETERS")}
          </h3>
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

      {/* Pricing detail */}
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
                  <TableCell className={cn("px-4 py-3 font-mono", theme.text)}>
                    {t("MODEL_PAGE.PRICE_PER_REQUEST", {
                      price: formatPrice(m.fixedPrice),
                    })}
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
                    {t("MODEL_PAGE.CONTEXT_TOKENS", { count: contextTag })}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="w-1/3 px-4 py-3 font-medium">
                  {t("MODEL_PAGE.ENDPOINTS")}
                </TableCell>
                <TableCell className="px-4 py-3">{endpointsDisplay}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="w-1/3 px-4 py-3 font-medium">
                  {t("MODEL_PAGE.VENDOR")}
                </TableCell>
                <TableCell className="px-4 py-3">{m.vendor.name}</TableCell>
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
            />
          </div>
        )}
      </section>

      {/* Code examples */}
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

      {/* FAQ */}
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
            answer={t("MODEL_PAGE.FAQ_API_A", { ...APP_VALUES, name: m.name })}
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

      {/* Similar models */}
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
                  href={{
                    pathname: "/models/[slug]",
                    params: { slug: sim.name },
                  }}
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

      {/* CTA */}
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
    </div>
  );
}

type Theme = ReturnType<typeof getVendorTheme>;

function StatCell(props: {
  label: string;
  value: string;
  suffix?: string;
  theme: Theme;
  mono?: boolean;
}) {
  return (
    <div className="hover:bg-accent/40 flex flex-col p-5 transition-colors">
      <span
        className={cn(
          "mb-3 font-mono text-[10px] tracking-widest uppercase",
          props.theme.text,
        )}
      >
        {props.label}
      </span>
      <span
        className={cn(
          "text-foreground text-2xl font-bold tracking-tight",
          props.mono && "font-mono text-lg",
        )}
      >
        {props.value}
      </span>
      {props.suffix && (
        <span className="text-muted-foreground mt-1 font-mono text-[10px]">
          {props.suffix}
        </span>
      )}
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
