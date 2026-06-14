"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { modelReleaseTs } from "@/hooks/ui/use-models-hook";
import {
  deriveOutputModality,
  inputPriceUnit,
  outputPriceUnit,
  type PriceUnit,
} from "@/lib/api/model-modality";
import type { ProcessedModel } from "@/lib/api/pricing";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import type { IconName } from "@/lib/config/icon-map";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/lib/utils/format/date";
import {
  formatPrice,
  formatTokenCount,
  formatTokens,
} from "@/lib/utils/format/number";
import type { ModelSummary } from "@/openapi";
import { useTranslations } from "next-intl";
import { useState } from "react";

const MODALITY_ICON: Record<string, IconName> = {
  text: "type",
  image: "image",
  audio: "mic",
  video: "video",
  file: "file",
  pdf: "file",
};

function ModalityIcons(props: { modalities: string[] }) {
  if (props.modalities.length === 0)
    return <span className="text-muted-foreground/60">-</span>;
  return (
    <div className="flex items-center gap-1.5">
      {props.modalities.map((mod) => {
        const icon = MODALITY_ICON[mod.toLowerCase()];
        return icon ? (
          <Icon key={mod} name={icon} className="h-4 w-4" aria-label={mod} />
        ) : (
          <span key={mod} className="font-mono text-[10px] uppercase">
            {mod}
          </span>
        );
      })}
    </div>
  );
}

function priceCell(value: number, unit: PriceUnit): string {
  if (unit === "dash" || value <= 0) return "-";
  if (unit === "perImage") return `${formatPrice(value)}/img`;
  return formatPrice(value);
}

function Bool(props: { on: boolean }) {
  return props.on ? (
    <Icon name="circle-check" className="h-4 w-4 text-emerald-500" />
  ) : (
    <span className="text-muted-foreground/50">-</span>
  );
}

// A comparison row: a label, a per-model render, and (optional) a numeric value
// for "highlight best" (higher=better unless `lowerBetter`).
type Row = {
  label: string;
  render: (m: ProcessedModel) => React.ReactNode;
  best?: (m: ProcessedModel) => number | null;
  lowerBetter?: boolean;
};

type Section = { title: string; rows: Row[] };

export function ComparisonTable(props: {
  models: ProcessedModel[];
  rankMap: Map<string, RankedModel>;
  perfMap: Map<string, ModelSummary>;
  onRemove: (name: string) => void;
}) {
  const t = useTranslations();
  const [highlight, setHighlight] = useState(false);
  const models = props.models;

  const inPrice = (m: ProcessedModel) =>
    m.isFixedPrice ? m.fixedPrice : m.inputPrice;
  const outPrice = (m: ProcessedModel) =>
    m.isFixedPrice ? m.fixedPrice : m.outputPrice;
  const ctxOf = (m: ProcessedModel) =>
    m.metadata.contextWindow ?? m.metadata.maxInputTokens ?? 0;
  const perf = (m: ProcessedModel) => props.perfMap.get(m.name);

  const sections: Section[] = [
    {
      title: t("MODELS.COMPARE.OVERVIEW"),
      rows: [
        {
          label: t("MODELS.COMPARE.AUTHOR"),
          render: (m) => m.vendor.name,
        },
        {
          label: t("MODELS.TABLE.CONTEXT"),
          render: (m) => formatTokenCount(ctxOf(m)),
          best: (m) => ctxOf(m) || null,
        },
        {
          label: t("MODELS.DETAIL.INPUT"),
          render: (m) => (
            <ModalityIcons modalities={m.metadata.inputModalities ?? []} />
          ),
        },
        {
          label: t("MODELS.DETAIL.OUTPUT"),
          render: (m) => (
            <ModalityIcons modalities={m.metadata.outputModalities ?? []} />
          ),
        },
        {
          label: t("MODELS.TABLE.RELEASED"),
          render: (m) => {
            const ts = modelReleaseTs(m);
            return ts > 0 ? formatLongDate(ts) : "-";
          },
        },
      ],
    },
    {
      title: t("MODELS.COMPARE.PRICING"),
      rows: [
        {
          label: t("MODELS.TABLE.INPUT"),
          render: (m) =>
            priceCell(inPrice(m), inputPriceUnit(deriveOutputModality(m))),
          best: (m) => inPrice(m) || null,
          lowerBetter: true,
        },
        {
          label: t("MODELS.TABLE.OUTPUT"),
          render: (m) =>
            priceCell(outPrice(m), outputPriceUnit(deriveOutputModality(m))),
          best: (m) => outPrice(m) || null,
          lowerBetter: true,
        },
      ],
    },
    {
      title: t("MODELS.COMPARE.PERFORMANCE"),
      rows: [
        {
          label: t("MODELS.COMPARE.LATENCY"),
          render: (m) => {
            const p = perf(m);
            return p ? `${Math.round(p.avg_latency_ms)} ms` : "-";
          },
          best: (m) => perf(m)?.avg_latency_ms ?? null,
          lowerBetter: true,
        },
        {
          label: t("MODELS.COMPARE.THROUGHPUT"),
          render: (m) => {
            const p = perf(m);
            return p ? `${Math.round(p.avg_tps)} t/s` : "-";
          },
          best: (m) => perf(m)?.avg_tps ?? null,
        },
      ],
    },
    {
      title: t("MODELS.COMPARE.FEATURES"),
      rows: [
        {
          label: t("MODELS.DETAIL.MAX_OUTPUT"),
          render: (m) => formatTokenCount(m.metadata.maxOutputTokens),
          best: (m) => m.metadata.maxOutputTokens ?? null,
        },
        {
          label: t("MODELS.CAPABILITY.REASONING"),
          render: (m) => <Bool on={Boolean(m.metadata.isReasoning)} />,
        },
        {
          label: t("MODELS.CAPABILITY.TOOLS"),
          render: (m) => <Bool on={Boolean(m.metadata.supportsTools)} />,
        },
        {
          label: t("MODELS.CAPABILITY.VISION"),
          render: (m) => <Bool on={Boolean(m.metadata.supportsVision)} />,
        },
        {
          label: t("MODELS.CAPABILITY.CACHE"),
          render: (m) => <Bool on={Boolean(m.metadata.supportsCache)} />,
        },
        {
          label: t("MODELS.DETAIL.QUANTIZATION"),
          render: (m) => m.metadata.quantization ?? "-",
        },
      ],
    },
    {
      title: t("MODELS.COMPARE.ACTIVITY"),
      rows: [
        {
          label: t("MODELS.TABLE.WEEKLY_TOKENS"),
          render: (m) => {
            const v = props.rankMap.get(m.name)?.total_tokens ?? 0;
            return v > 0 ? formatTokens(v) : "-";
          },
          best: (m) => props.rankMap.get(m.name)?.total_tokens ?? null,
        },
      ],
    },
  ];

  const gridCols = {
    gridTemplateColumns: `minmax(9rem,1fr) repeat(${models.length}, minmax(10rem,1fr))`,
  };

  const bestNameFor = (row: Row): string | null => {
    if (!row.best || !highlight) return null;
    let bestName: string | null = null;
    let bestVal: number | null = null;
    for (const m of models) {
      const v = row.best(m);
      if (v === null) continue;
      if (bestVal === null || (row.lowerBetter ? v < bestVal : v > bestVal)) {
        bestVal = v;
        bestName = m.name;
      }
    }
    return bestName;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <span className="text-muted-foreground font-mono text-xs">
          {t("MODELS.COMPARE.HIGHLIGHT_BEST")}
        </span>
        <Switch checked={highlight} onCheckedChange={setHighlight} />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* Column headers */}
          <div
            className="border-border grid items-end gap-3 border-b pb-3"
            style={gridCols}
          >
            <span />
            {models.map((m) => (
              <div key={m.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <VendorIcon vendor={m.vendor.name} size={20} />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => props.onRemove(m.name)}
                    aria-label={t("MODELS.COMPARE.REMOVE")}
                    className="h-6 w-6"
                  >
                    <Icon name="x" className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="truncate font-mono text-sm font-medium">
                  {m.name}
                </span>
              </div>
            ))}
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <div className="text-muted-foreground px-1 pt-5 pb-2 font-mono text-xs font-medium uppercase">
                {section.title}
              </div>
              {section.rows.map((row) => {
                const best = bestNameFor(row);
                return (
                  <div
                    key={row.label}
                    className="border-border/40 grid items-center gap-3 border-b py-2.5"
                    style={gridCols}
                  >
                    <span className="text-muted-foreground font-mono text-xs">
                      {row.label}
                    </span>
                    {models.map((m) => (
                      <div
                        key={m.name}
                        className={cn(
                          "font-mono text-sm",
                          best === m.name &&
                            "rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {row.render(m)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
