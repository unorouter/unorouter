"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import type { RankedModel } from "@/lib/api/typebox/rankings";
import { cn } from "@/lib/utils";
import { formatTokens } from "@/lib/utils/format/number";
import { useLocale, useTranslations } from "next-intl";
import { ModelLink, VendorLink } from "./entity-links";
import { GrowthText } from "./growth-text";
import { splitHalf } from "./rankings-helpers";

type LeaderboardVariant = "default" | "compact";

type ModelLeaderboardProps = {
  rows: RankedModel[];
  variant?: LeaderboardVariant;
  limit?: number;
};

export function ModelLeaderboard(props: ModelLeaderboardProps) {
  const limited = props.limit ? props.rows.slice(0, props.limit) : props.rows;
  const [left, right] = splitHalf(limited);
  const variant = props.variant ?? "default";

  if (limited.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
      <ModelList rows={left} variant={variant} />
      {right.length > 0 && <ModelList rows={right} variant={variant} />}
    </div>
  );
}

function ModelList(props: {
  rows: RankedModel[];
  variant: LeaderboardVariant;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const compact = props.variant === "compact";
  return (
    <ul>
      {props.rows.map((row) => (
        <li
          key={row.model_name}
          className={cn("flex items-center gap-3", compact ? "py-2" : "py-2.5")}
        >
          <span className="text-muted-foreground w-6 shrink-0 text-right font-mono text-xs tabular-nums">
            {row.rank}.
          </span>
          <span className="shrink-0">
            <VendorIcon vendor={row.vendor} size={compact ? 20 : 22} />
          </span>
          <div className="min-w-0 flex-1">
            <ModelLink
              modelName={row.model_name}
              vendor={row.vendor}
              className={cn(
                "text-foreground block truncate font-mono font-medium",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {row.model_name}
            </ModelLink>
            <p
              className={cn(
                "text-muted-foreground truncate italic",
                compact ? "text-[11px]" : "text-xs",
              )}
            >
              {t("RANKINGS.MODELS.BY_AUTHOR_LABEL")}{" "}
              <VendorLink vendor={row.vendor}>
                {row.vendor.toLowerCase()}
              </VendorLink>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div
              className={cn(
                "text-foreground font-mono font-semibold tabular-nums",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {formatTokens(row.total_tokens, locale)}
              {!compact && (
                <>
                  {" "}
                  <span className="text-muted-foreground font-normal">
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
