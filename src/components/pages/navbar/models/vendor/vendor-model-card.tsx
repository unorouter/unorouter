"use client";

import { EMPTY_METADATA } from "@/lib/api/model-modality";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Link } from "@/i18n/navigation";
import { NEW_MODEL_MS } from "@/hooks/ui/use-models-hook";
import { useState } from "react";
import type { PricingCatalogModel } from "@/openapi";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { modelHref } from "@/lib/utils/base";
import { formatTokenCount } from "@/lib/utils/format/number";
import { CapabilityChips } from "../detail/header/capability-chips";
import { ModelPriceMetas } from "../model-price-meta";
import { useLocale, useTranslations } from "next-intl";

export function VendorModelCard(props: { model: PricingCatalogModel }) {
  const t = useTranslations();
  const locale = useLocale();
  const model = props.model;
  const theme = getVendorTheme(model.vendor);
  const ctx = model.metadata?.contextWindow ?? model.metadata?.maxInputTokens;
  const released = model.release_ts;
  const [now] = useState(() => Date.now());
  const isNew = released > 0 && now - released < NEW_MODEL_MS;
  const isDeprecated = Boolean(model.metadata?.deprecationDate);

  return (
    <Link
      href={modelHref(model.model_name, model.vendor)}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5",
        theme.bg,
        theme.border,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <VendorIcon vendor={model.vendor} size={18} />
          <span
            className={cn(
              "truncate font-mono text-[11px] uppercase",
              theme.text,
            )}
          >
            {model.vendor}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {model.is_free && (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
              {t("MODELS.TABLE.FREE")}
            </span>
          )}
          {isNew && (
            <span className="rounded bg-orange-500/15 px-1.5 py-0.5 font-mono text-[10px] text-orange-600 dark:text-orange-400">
              {t("MODELS.VENDOR.NEW")}
            </span>
          )}
          {isDeprecated && (
            <span className="text-muted-foreground rounded bg-zinc-500/15 px-1.5 py-0.5 font-mono text-[10px]">
              {t("MODELS.VENDOR.DEPRECATED")}
            </span>
          )}
        </div>
      </div>

      <div className="truncate text-base font-medium">{model.model_name}</div>

      {model.description && (
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {model.description}
        </p>
      )}

      <CapabilityChips
        metadata={model.metadata ?? EMPTY_METADATA}
        variant="card"
        limit={4}
      />

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        {ctx ? (
          <span className="text-muted-foreground">
            {formatTokenCount(ctx, locale)}
          </span>
        ) : null}
        <ModelPriceMetas model={model} emphasis />
      </div>
    </Link>
  );
}
