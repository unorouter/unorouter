"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { CopyButton } from "@/components/elements/code/copy-button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildGroupEntries,
  type GroupEntry,
  gridPriceParts,
  gridPricingColumns,
  type EndpointInfo,
  GridPricingRow,
  ProcessedModel,
} from "@/lib/api/pricing";
import { env } from "@/lib/config/env";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CachePricing } from "./cache-pricing";
import { TieredPricing } from "./tiered-pricing";
import { AutoGroupChain } from "./auto-group-chain";
import { CapabilityChips } from "./capability-chips";
import {
  hasAnyCapability,
  hasAnyParameter,
  hasAnyQuickStat,
} from "./capability-helpers";
import { ModalitiesRow } from "./modalities-row";
import { PerformanceSection } from "./performance-section";
import { QuickStats } from "./quick-stats";
import { SupportedParameters } from "./supported-parameters";

type ModelDetailSheetProps = {
  model: ProcessedModel | null;
  endpointMap: Record<string, EndpointInfo>;
  groupRatioMap: Record<string, number>;
  autoGroups: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModelDetailSheet(props: ModelDetailSheetProps) {
  const t = useTranslations();
  const model = props.model;

  if (!model) return null;

  const theme = getVendorTheme(model.vendor.name);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-border border-b pb-4">
          <div className="flex items-center gap-3">
            <VendorIcon vendor={model.vendor.name} size={28} />
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2 font-mono text-base tracking-wide">
                <span className="truncate">{model.name}</span>
                <CopyButton text={model.name} />
              </SheetTitle>
              <SheetDescription className="font-mono text-[10px] tracking-wider uppercase">
                {model.vendor.name}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          {model.description && (
            <section>
              <SectionHeader
                icon={
                  <Icon name="info" className="h-3.5 w-3.5 text-cyan-400" />
                }
                title={t("MODELS.DETAIL.DESCRIPTION")}
              />
              <p className="text-muted-foreground text-sm leading-relaxed">
                {model.description}
              </p>
            </section>
          )}

          {model.tags.length > 0 && (
            <section>
              <SectionHeader
                icon={
                  <Icon name="tag" className="h-3.5 w-3.5 text-purple-400" />
                }
                title={t("MODELS.DETAIL.TAGS")}
              />
              <div className="flex flex-wrap gap-1.5">
                {model.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn(
                      "font-mono text-[10px] uppercase",
                      theme.tagBg,
                      theme.tagBorder,
                      theme.text,
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {hasAnyCapability(model.metadata) && (
            <section>
              <SectionHeader
                icon={
                  <Icon
                    name="sparkles"
                    className="h-3.5 w-3.5 text-emerald-400"
                  />
                }
                title={t("MODELS.DETAIL.CAPABILITIES")}
              />
              <CapabilityChips metadata={model.metadata} variant="drawer" />
            </section>
          )}

          {((model.metadata.inputModalities ?? []).length > 0 ||
            (model.metadata.outputModalities ?? []).length > 0) && (
            <section>
              <SectionHeader
                icon={
                  <Icon
                    name="layers"
                    className="h-3.5 w-3.5 text-emerald-400"
                  />
                }
                title={t("MODELS.DETAIL.MODALITIES")}
              />
              <ModalitiesRow metadata={model.metadata} />
            </section>
          )}

          {hasAnyQuickStat(model.metadata) && (
            <section>
              <SectionHeader
                icon={
                  <Icon name="info" className="h-3.5 w-3.5 text-cyan-400" />
                }
                title={t("MODELS.DETAIL.QUICK_STATS")}
              />
              <QuickStats metadata={model.metadata} />
            </section>
          )}

          <section>
            <SectionHeader
              icon={
                <span className={cn("font-mono text-xs font-bold", theme.text)}>
                  $
                </span>
              }
              title={t("MODELS.DETAIL.PRICING")}
            />
            <div
              className={cn("rounded-lg border p-4", theme.bg, theme.border)}
            >
              {model.isFixedPrice ? (
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn("font-mono text-lg font-bold", theme.text)}
                  >
                    {formatPrice(model.fixedPrice)}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {t("MODELS.PRICE.PER_REQUEST")}
                  </span>
                </div>
              ) : model.isTiered ? (
                <TieredPricing
                  model={model}
                  theme={theme}
                  groupRatioMap={props.groupRatioMap}
                />
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground font-mono text-[10px] uppercase">
                        {t("MODELS.PRICE.INPUT")}
                      </span>
                      <div
                        className={cn(
                          "font-mono text-lg font-bold",
                          theme.text,
                        )}
                      >
                        {formatPrice(model.inputPrice)}
                      </div>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {t("MODELS.PRICE.PER_MILLION")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-mono text-[10px] uppercase">
                        {t("MODELS.PRICE.OUTPUT")}
                      </span>
                      <div
                        className={cn(
                          "font-mono text-lg font-bold",
                          theme.text,
                        )}
                      >
                        {formatPrice(model.outputPrice)}
                      </div>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {t("MODELS.PRICE.PER_MILLION")}
                      </span>
                    </div>
                  </div>
                  {model.originalInputPrice !== null &&
                    model.originalOutputPrice !== null && (
                      <div className="text-muted-foreground/50 font-mono text-xs line-through">
                        {t("MODELS.PRICE.ORIGINAL")}:{" "}
                        {formatPrice(model.originalInputPrice)}/
                        {formatPrice(model.originalOutputPrice)}{" "}
                        {t("MODELS.PRICE.PER_MILLION")}
                      </div>
                    )}
                  <CachePricing model={model} theme={theme} />
                </div>
              )}
            </div>
          </section>

          {model.gridPricing && (
            <GridPricingSection gridPricing={model.gridPricing} theme={theme} />
          )}

          {/* Group Pricing (collapsible) — skipped for tiered models, which
              don't have a single per-token price to multiply per group. */}
          {model.enableGroups.length > 0 && !model.isTiered && (
            <GroupPricingSection
              model={model}
              groupRatioMap={props.groupRatioMap}
              autoGroups={props.autoGroups}
              theme={theme}
            />
          )}

          {hasAnyParameter(model.metadata) && (
            <section>
              <SectionHeader
                icon={
                  <Icon
                    name="settings"
                    className="h-3.5 w-3.5 text-purple-400"
                  />
                }
                title={t("MODELS.DETAIL.SUPPORTED_PARAMETERS")}
              />
              <SupportedParameters metadata={model.metadata} />
            </section>
          )}

          <section>
            <SectionHeader
              icon={
                <Icon
                  name="heart-pulse"
                  className="h-3.5 w-3.5 text-rose-400"
                />
              }
              title={t("MODELS.DETAIL.PERFORMANCE")}
            />
            <PerformanceSection modelName={model.name} />
          </section>

          {model.endpointTypes.length > 0 && (
            <section>
              <SectionHeader
                icon={
                  <Icon name="link" className="h-3.5 w-3.5 text-green-400" />
                }
                title={t("MODELS.DETAIL.ENDPOINTS")}
              />
              <div className="space-y-2">
                {model.endpointTypes.map((endpoint) => {
                  const info = props.endpointMap[endpoint];
                  let path = info?.path ?? "";
                  if (path.includes("{model}")) {
                    path = path.replaceAll("{model}", model.name);
                  }
                  const method = info?.method ?? "POST";
                  const apiBase = env.apiUrl ?? "";
                  const fullUrl = path ? `${apiBase}${path}` : "";

                  return (
                    <div
                      key={endpoint}
                      className="border-border rounded border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          <span className="font-mono text-xs">{endpoint}</span>
                        </div>
                        {path && (
                          <span className="text-muted-foreground font-mono text-[10px] uppercase">
                            {method}
                          </span>
                        )}
                      </div>
                      {fullUrl && (
                        <div className="mt-1.5 flex items-start gap-1.5 pl-3.5">
                          <p className="text-muted-foreground font-mono text-[10px] break-all">
                            {fullUrl}
                          </p>
                          <CopyButton text={fullUrl} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <p className="text-muted-foreground/60 font-mono text-[10px] leading-relaxed italic">
            {t("MODELS.PRICE.VARIES_TOOLTIP")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader(props: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {props.icon}
      <span className="text-foreground font-mono text-xs tracking-wider uppercase">
        {props.title}
      </span>
    </div>
  );
}

function GridPricingTable(props: {
  rows: GridPricingRow[];
  priceMultiplier?: number;
  theme: ReturnType<typeof getVendorTheme>;
  pricingLabel: string;
}) {
  const columns = gridPricingColumns(props.rows);

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="border-border/40 border-b">
            {columns.map((col) => (
              <th
                key={col}
                className="text-foreground px-2 py-1.5 text-left text-[10px] font-normal uppercase"
              >
                {col}
              </th>
            ))}
            <th className="text-foreground px-2 py-1.5 text-right text-[10px] font-normal uppercase">
              {props.pricingLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, i) => {
            const { price, suffix } = gridPriceParts(
              row,
              props.priceMultiplier,
            );
            return (
              <tr key={i} className="border-border/20 border-b last:border-0">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="text-muted-foreground px-2 py-1.5 text-[11px]"
                  >
                    {String(row[col] ?? "")}
                  </td>
                ))}
                <td
                  className={cn(
                    "px-2 py-1.5 text-right text-[11px] font-medium",
                    props.theme.text,
                  )}
                >
                  {formatPrice(price)}
                  {suffix && (
                    <span className="text-muted-foreground ml-0.5 text-[10px]">
                      {suffix}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GridPricingSection(props: {
  gridPricing: GridPricingRow[];
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();

  return (
    <section>
      <SectionHeader
        icon={<Icon name="grid-3x3" className="h-3.5 w-3.5 text-cyan-400" />}
        title={t("MODELS.DETAIL.GRID_PRICING")}
      />
      <div
        className={cn(
          "rounded-lg border p-3",
          props.theme.bg,
          props.theme.border,
        )}
      >
        <GridPricingTable
          rows={props.gridPricing}
          theme={props.theme}
          pricingLabel={t("MODELS.DETAIL.PRICING")}
        />
      </div>
    </section>
  );
}

function GroupPricingSection(props: {
  model: ProcessedModel;
  groupRatioMap: Record<string, number>;
  autoGroups: string[];
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const model = props.model;
  const theme = props.theme;
  const hasGrid = model.gridPricing !== null;
  const groupEntries = buildGroupEntries(
    model.enableGroups,
    props.groupRatioMap,
  );

  if (groupEntries.length === 0) return null;

  return (
    <section>
      <AutoGroupChain
        enableGroups={model.enableGroups}
        autoGroups={props.autoGroups}
        className="mb-3"
      />
      <button
        onClick={() => setOpen(!open)}
        className="mb-3 flex w-full items-center gap-2"
      >
        <Icon name="layers" className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-foreground font-mono text-xs tracking-wider uppercase">
          {hasGrid
            ? t("MODELS.DETAIL.GRID_PRICING_GROUP")
            : t("MODELS.DETAIL.GROUP_PRICING")}
        </span>
        <Icon
          name="chevron-down"
          className={cn(
            "text-muted-foreground ml-auto h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="space-y-4">
          {hasGrid ? (
            <GroupPricingGrid
              entries={groupEntries}
              gridPricing={model.gridPricing!}
              theme={theme}
            />
          ) : model.isFixedPrice ? (
            <GroupPricingFixed
              entries={groupEntries}
              fixedPrice={model.fixedPrice}
              theme={theme}
            />
          ) : (
            <GroupPricingTokens
              entries={groupEntries}
              modelRatio={model.modelRatio}
              completionRatio={model.completionRatio}
              theme={theme}
            />
          )}
        </div>
      )}
    </section>
  );
}

function GroupPricingGrid(props: {
  entries: GroupEntry[];
  gridPricing: GridPricingRow[];
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  return (
    <>
      {props.entries.map((ge) => (
        <div key={ge.group}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400">
              {ge.group}
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              {ge.ratio}x
            </span>
          </div>
          <div
            className={cn(
              "rounded-lg border p-3",
              props.theme.bg,
              props.theme.border,
            )}
          >
            <GridPricingTable
              rows={props.gridPricing}
              priceMultiplier={ge.ratio}
              theme={props.theme}
              pricingLabel={t("MODELS.DETAIL.PRICING")}
            />
          </div>
        </div>
      ))}
    </>
  );
}

function GroupPricingFixed(props: {
  entries: GroupEntry[];
  fixedPrice: number;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        props.theme.bg,
        props.theme.border,
      )}
    >
      <div className="border-border/40 mb-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0 border-b pb-2">
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.GROUP_HEADER_GROUP")}
        </span>
        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.PRICING")}
        </span>
      </div>
      <div className="space-y-1.5">
        {props.entries.map((ge) => (
          <div
            key={ge.group}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-4"
          >
            <span className="text-muted-foreground truncate font-mono text-[10px]">
              {ge.group}
            </span>
            <span
              className={cn(
                "text-right font-mono text-xs font-medium",
                props.theme.text,
              )}
            >
              {formatPrice(props.fixedPrice * ge.ratio)}
              <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                {t("MODELS.PRICE.PER_REQUEST")}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupPricingTokens(props: {
  entries: GroupEntry[];
  modelRatio: number;
  completionRatio: number;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        props.theme.bg,
        props.theme.border,
      )}
    >
      <div className="border-border/40 mb-2 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-0 border-b pb-2">
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.GROUP_HEADER_GROUP")}
        </span>
        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.GROUP_HEADER_INPUT")}
        </span>
        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
          {t("MODELS.DETAIL.GROUP_HEADER_OUTPUT")}
        </span>
      </div>
      <div className="space-y-1.5">
        {props.entries.map((ge) => {
          const inputPrice = props.modelRatio * 2 * ge.ratio;
          const outputPrice = inputPrice * props.completionRatio;
          return (
            <div
              key={ge.group}
              className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4"
            >
              <span className="text-muted-foreground truncate font-mono text-[10px]">
                {ge.group}
              </span>
              <span
                className={cn(
                  "text-right font-mono text-xs font-medium",
                  props.theme.text,
                )}
              >
                {formatPrice(inputPrice)}
              </span>
              <span
                className={cn(
                  "text-right font-mono text-xs font-medium",
                  props.theme.text,
                )}
              >
                {formatPrice(outputPrice)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
