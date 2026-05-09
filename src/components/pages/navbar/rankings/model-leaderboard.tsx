"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import { useTranslations } from "next-intl";
import { ModelLink, VendorLink } from "./entity-links";
import { formatTokens } from "./format";
import { GrowthText } from "./growth-text";

type ModelLeaderboardProps = {
  rows: RankedModel[];
  variant?: "default" | "compact";
  limit?: number;
};

export function ModelLeaderboard(props: ModelLeaderboardProps) {
  const limited = props.limit ? props.rows.slice(0, props.limit) : props.rows;
  const half = Math.ceil(limited.length / 2);
  const left = limited.slice(0, half);
  const right = limited.slice(half);
  const variant = props.variant ?? "default";

  if (limited.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
      <ModelList rows={left} variant={variant} />
      {right.length > 0 && <ModelList rows={right} variant={variant} />}
    </div>
  );
}

function ModelList(props: {
  rows: RankedModel[];
  variant: "default" | "compact";
}) {
  const t = useTranslations();
  const compact = props.variant === "compact";
  return (
    <ul>
      {props.rows.map((row) => (
        <li
          key={row.model_name}
          className={
            compact
              ? "flex items-center gap-3 py-2"
              : "flex items-center gap-3 py-2.5"
          }
        >
          <span className="text-muted-foreground/80 w-6 shrink-0 text-right font-mono text-xs tabular-nums">
            {row.rank}.
          </span>
          <span className="shrink-0">
            <VendorIcon vendor={row.vendor} size={compact ? 20 : 22} />
          </span>
          <div className="min-w-0 flex-1">
            <ModelLink
              modelName={row.model_name}
              className={
                compact
                  ? "text-foreground block truncate font-mono text-xs font-medium"
                  : "text-foreground block truncate font-mono text-sm font-medium"
              }
            >
              {row.model_name}
            </ModelLink>
            <p
              className={
                compact
                  ? "text-muted-foreground/80 truncate text-[11px] italic"
                  : "text-muted-foreground/80 truncate text-xs italic"
              }
            >
              {t("RANKINGS.MODELS.BY_AUTHOR_LABEL")}{" "}
              <VendorLink vendor={row.vendor}>
                {row.vendor.toLowerCase()}
              </VendorLink>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div
              className={
                compact
                  ? "text-foreground font-mono text-xs font-semibold tabular-nums"
                  : "text-foreground font-mono text-sm font-semibold tabular-nums"
              }
            >
              {formatTokens(row.total_tokens)}
              {!compact && (
                <>
                  {" "}
                  <span className="text-muted-foreground/80 font-normal">
                    {t("RANKINGS.MODELS.TOKENS_SUFFIX")}
                  </span>
                </>
              )}
            </div>
            <GrowthText
              value={row.growth_pct}
              className={compact ? "text-[10px]" : "text-[11px]"}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
