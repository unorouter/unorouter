"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { modelReleaseTs } from "@/hooks/ui/use-models-hook";
import {
  deriveOutputModality,
  inputPriceUnit,
  outputPriceUnit,
  type PriceUnit,
} from "@/lib/api/model-modality";
import type { ProcessedModel } from "@/lib/api/pricing";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import { formatLongDate } from "@/lib/utils/format/date";
import {
  formatPrice,
  formatTokenCount,
  formatTokens,
} from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { CapabilityChips } from "../detail/capability-chips";

function priceCell(value: number, unit: PriceUnit): string {
  if (unit === "dash" || value <= 0) return "-";
  if (unit === "perImage") return `${formatPrice(value)}/img`;
  return formatPrice(value);
}

export function ComparisonTable(props: {
  models: ProcessedModel[];
  rankMap: Map<string, RankedModel>;
  onRemove: (name: string) => void;
}) {
  const t = useTranslations();
  const models = props.models;

  const rows: {
    label: string;
    render: (m: ProcessedModel) => React.ReactNode;
  }[] = [
    {
      label: t("MODELS.TABLE.INPUT"),
      render: (m) =>
        priceCell(
          m.isFixedPrice ? m.fixedPrice : m.inputPrice,
          inputPriceUnit(deriveOutputModality(m)),
        ),
    },
    {
      label: t("MODELS.TABLE.OUTPUT"),
      render: (m) =>
        priceCell(
          m.isFixedPrice ? m.fixedPrice : m.outputPrice,
          outputPriceUnit(deriveOutputModality(m)),
        ),
    },
    {
      label: t("MODELS.TABLE.CONTEXT"),
      render: (m) =>
        formatTokenCount(m.metadata.contextWindow ?? m.metadata.maxInputTokens),
    },
    {
      label: t("MODELS.DETAIL.MAX_OUTPUT"),
      render: (m) => formatTokenCount(m.metadata.maxOutputTokens),
    },
    {
      label: t("MODELS.TABLE.RELEASED"),
      render: (m) => {
        const ts = modelReleaseTs(m);
        return ts > 0 ? formatLongDate(ts) : "-";
      },
    },
    {
      label: t("MODELS.DETAIL.TOKENIZER"),
      render: (m) => m.metadata.tokenizer ?? "-",
    },
    {
      label: t("MODELS.TABLE.WEEKLY_TOKENS"),
      render: (m) => {
        const r = props.rankMap.get(m.name);
        return r ? formatTokens(r.total_tokens) : "-";
      },
    },
    {
      label: t("MODELS.COMPARE.CAPABILITIES"),
      render: (m) => <CapabilityChips metadata={m.metadata} />,
    },
  ];

  const gridCols = {
    gridTemplateColumns: `minmax(8rem,1fr) repeat(${models.length}, minmax(10rem,1fr))`,
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
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
              <span className="text-muted-foreground font-mono text-xs">
                {m.vendor.name}
              </span>
            </div>
          ))}
        </div>

        {rows.map((row) => (
          <div
            key={row.label}
            className="border-border/50 grid items-center gap-3 border-b py-3"
            style={gridCols}
          >
            <span className="text-muted-foreground font-mono text-xs uppercase">
              {row.label}
            </span>
            {models.map((m) => (
              <div key={m.name} className="font-mono text-sm">
                {row.render(m)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
