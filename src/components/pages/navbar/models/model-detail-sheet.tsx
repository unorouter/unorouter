"use client";

import { CopyButton } from "@/components/elements/code/copy-button";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  EndpointInfo,
  GridPricingRow,
  ProcessedModel,
} from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/base";
import { getVendorTheme } from "@/lib/vendor-themes";
import { useTranslations } from "next-intl";
import {
  LuLink,
  LuInfo,
  LuTag,
  LuChevronDown,
  LuLayers,
  LuGrid3X3,
} from "react-icons/lu";
import { useState } from "react";

type ModelDetailSheetProps = {
  model: ProcessedModel | null;
  endpointMap: Record<string, EndpointInfo>;
  groupRatioMap: Record<string, number>;
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
          {/* Description */}
          {model.description && (
            <section>
              <SectionHeader
                icon={<LuInfo className="h-3.5 w-3.5 text-cyan-400" />}
                title={t("MODELS.DETAIL_DESCRIPTION")}
              />
              <p className="text-muted-foreground text-sm leading-relaxed">
                {model.description}
              </p>
            </section>
          )}

          {/* Tags */}
          {model.tags.length > 0 && (
            <section>
              <SectionHeader
                icon={<LuTag className="h-3.5 w-3.5 text-purple-400" />}
                title={t("MODELS.DETAIL_TAGS")}
              />
              <div className="flex flex-wrap gap-1.5">
                {model.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn(
                      "font-mono text-[10px] uppercase",
                      theme.tagBg,
                      theme.text,
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Pricing */}
          <section>
            <SectionHeader
              icon={
                <span className={cn("font-mono text-xs font-bold", theme.text)}>
                  $
                </span>
              }
              title={t("MODELS.DETAIL_PRICING")}
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
                    {t("MODELS.PRICE_PER_REQUEST")}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground font-mono text-[10px] uppercase">
                      {t("MODELS.PRICE_INPUT")}
                    </span>
                    <div
                      className={cn("font-mono text-lg font-bold", theme.text)}
                    >
                      {formatPrice(model.inputPrice)}
                    </div>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {t("MODELS.PRICE_PER_MILLION")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-mono text-[10px] uppercase">
                      {t("MODELS.PRICE_OUTPUT")}
                    </span>
                    <div
                      className={cn("font-mono text-lg font-bold", theme.text)}
                    >
                      {formatPrice(model.outputPrice)}
                    </div>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {t("MODELS.PRICE_PER_MILLION")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Grid Pricing Table */}
          {model.gridPricing && (
            <GridPricingSection gridPricing={model.gridPricing} theme={theme} />
          )}

          {/* Group Pricing (collapsible) */}
          {model.enableGroups.length > 0 && (
            <GroupPricingSection
              model={model}
              groupRatioMap={props.groupRatioMap}
              theme={theme}
            />
          )}

          {/* API Endpoints */}
          {model.endpointTypes.length > 0 && (
            <section>
              <SectionHeader
                icon={<LuLink className="h-3.5 w-3.5 text-green-400" />}
                title={t("MODELS.DETAIL_ENDPOINTS")}
              />
              <div className="space-y-2">
                {model.endpointTypes.map((endpoint) => {
                  const info = props.endpointMap[endpoint];
                  let path = info?.path ?? "";
                  if (path.includes("{model}")) {
                    path = path.replaceAll("{model}", model.name);
                  }
                  const method = info?.method ?? "POST";
                  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
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

          {/* Pricing note */}
          <p className="text-muted-foreground/60 font-mono text-[10px] leading-relaxed italic">
            {t("MODELS.PRICE_VARIES_TOOLTIP")}
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

function getGridColumns(rows: GridPricingRow[]): string[] {
  const first = rows[0];
  if (!first) return [];
  return Object.keys(first).filter(
    (k) => k !== "Pricing" && k !== "PricingSuffix",
  );
}

function GridPricingTable(props: {
  rows: GridPricingRow[];
  priceMultiplier?: number;
  theme: ReturnType<typeof getVendorTheme>;
  pricingLabel: string;
}) {
  const columns = getGridColumns(props.rows);
  const multiplier = props.priceMultiplier ?? 1;

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
            const price =
              typeof row.Pricing === "number" ? row.Pricing * multiplier : 0;
            const suffix =
              typeof row.PricingSuffix === "string" ? row.PricingSuffix : "";
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
        icon={<LuGrid3X3 className="h-3.5 w-3.5 text-cyan-400" />}
        title={t("MODELS.DETAIL_GRID_PRICING")}
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
          pricingLabel={t("MODELS.DETAIL_PRICING")}
        />
      </div>
    </section>
  );
}

function GroupPricingSection(props: {
  model: ProcessedModel;
  groupRatioMap: Record<string, number>;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const model = props.model;
  const theme = props.theme;
  const hasGrid = model.gridPricing !== null;

  const groupEntries = model.enableGroups
    .map((group) => {
      const ratio = props.groupRatioMap[group];
      if (ratio === undefined) return null;
      return { group, ratio };
    })
    .filter(Boolean)
    .sort((a, b) => a!.ratio - b!.ratio) as {
    group: string;
    ratio: number;
  }[];

  if (groupEntries.length === 0) return null;

  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="mb-3 flex w-full items-center gap-2"
      >
        <LuLayers className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-foreground font-mono text-xs tracking-wider uppercase">
          {hasGrid
            ? t("MODELS.DETAIL_GRID_PRICING_GROUP")
            : t("MODELS.DETAIL_GROUP_PRICING")}
        </span>
        <LuChevronDown
          className={cn(
            "text-muted-foreground ml-auto h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="space-y-4">
          {hasGrid
            ? groupEntries.map((ge) => (
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
                      theme.bg,
                      theme.border,
                    )}
                  >
                    <GridPricingTable
                      rows={model.gridPricing!}
                      priceMultiplier={ge.ratio}
                      theme={theme}
                      pricingLabel={t("MODELS.DETAIL_PRICING")}
                    />
                  </div>
                </div>
              ))
            : model.isFixedPrice
              ? (() => {
                  const groupPrices = groupEntries.map((ge) => ({
                    ...ge,
                    price: model.fixedPrice * ge.ratio,
                  }));
                  return (
                    <div
                      className={cn(
                        "rounded-lg border p-3",
                        theme.bg,
                        theme.border,
                      )}
                    >
                      <div className="border-border/40 mb-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0 border-b pb-2">
                        <span className="text-muted-foreground font-mono text-[10px] uppercase">
                          {t("MODELS.DETAIL_GROUP_HEADER_GROUP")}
                        </span>
                        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
                          {t("MODELS.DETAIL_PRICING")}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {groupPrices.map((gp) => (
                          <div
                            key={gp.group}
                            className="grid grid-cols-[1fr_auto] items-baseline gap-x-4"
                          >
                            <span className="text-muted-foreground truncate font-mono text-[10px]">
                              {gp.group}
                            </span>
                            <span
                              className={cn(
                                "text-right font-mono text-xs font-medium",
                                theme.text,
                              )}
                            >
                              {formatPrice(gp.price)}
                              <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                                {t("MODELS.PRICE_PER_REQUEST")}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              : (() => {
                  const groupPrices = groupEntries.map((ge) => {
                    const inputPrice = model.modelRatio * 2 * ge.ratio;
                    const outputPrice = inputPrice * model.completionRatio;
                    return { ...ge, inputPrice, outputPrice };
                  });
                  return (
                    <div
                      className={cn(
                        "rounded-lg border p-3",
                        theme.bg,
                        theme.border,
                      )}
                    >
                      <div className="border-border/40 mb-2 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-0 border-b pb-2">
                        <span className="text-muted-foreground font-mono text-[10px] uppercase">
                          {t("MODELS.DETAIL_GROUP_HEADER_GROUP")}
                        </span>
                        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
                          {t("MODELS.DETAIL_GROUP_HEADER_INPUT")}
                        </span>
                        <span className="text-muted-foreground text-right font-mono text-[10px] uppercase">
                          {t("MODELS.DETAIL_GROUP_HEADER_OUTPUT")}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {groupPrices.map((gp) => (
                          <div
                            key={gp.group}
                            className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4"
                          >
                            <span className="text-muted-foreground truncate font-mono text-[10px]">
                              {gp.group}
                            </span>
                            <span
                              className={cn(
                                "text-right font-mono text-xs font-medium",
                                theme.text,
                              )}
                            >
                              {formatPrice(gp.inputPrice)}
                            </span>
                            <span
                              className={cn(
                                "text-right font-mono text-xs font-medium",
                                theme.text,
                              )}
                            >
                              {formatPrice(gp.outputPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
        </div>
      )}
    </section>
  );
}
