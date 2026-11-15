"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import type { RankedModel } from "@/openapi";
import { formatTokens } from "@/lib/utils/format/number";
import { useLocale, useTranslations } from "next-intl";
import { ModelLink, VendorLink } from "./entity-links";
import { GrowthText } from "./growth-text";
import { splitHalf } from "./rankings-helpers";

export function ModelLeaderboard(props: {
  rows: RankedModel[];
  limit?: number;
}) {
  const limited = props.limit ? props.rows.slice(0, props.limit) : props.rows;
  const [left, right] = splitHalf(limited);

  if (limited.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
      <ModelList rows={left} />
      {right.length > 0 && <ModelList rows={right} />}
    </div>
  );
}

function ModelList(props: { rows: RankedModel[] }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <ul>
      {props.rows.map((row) => (
        <li key={row.model_name} className="flex items-center gap-3 py-2.5">
          <span className="text-muted-foreground w-6 shrink-0 text-right font-mono text-xs tabular-nums">
            {row.rank}.
          </span>
          <span className="shrink-0">
            <VendorIcon vendor={row.vendor} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <ModelLink
              modelName={row.model_name}
              vendor={row.vendor}
              className="text-foreground block truncate font-mono text-sm font-medium"
            >
              {row.model_name}
            </ModelLink>
            <p className="text-muted-foreground truncate text-xs italic">
              {t("RANKINGS.MODELS.BY_AUTHOR_LABEL")}{" "}
              <VendorLink vendor={row.vendor}>
                {row.vendor.toLowerCase()}
              </VendorLink>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-foreground font-mono text-sm font-semibold tabular-nums">
              {formatTokens(row.total_tokens, locale)}{" "}
              <span className="text-muted-foreground font-normal">
                {t("RANKINGS.MODELS.TOKENS_SUFFIX")}
              </span>
            </div>
            <GrowthText value={row.growth_pct} className="text-[11px]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
