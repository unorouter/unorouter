"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { OwnPurposeBadge } from "@/components/elements/model/group-data-policy";
import { Icon } from "@/components/ui/icon";
import { isFlatVariant } from "@/lib/api/model-modality";
import type { PricingCatalogModel } from "@/openapi";
import type { RankedModel } from "@/openapi";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { cn } from "@/lib/utils";
import { formatMsDate } from "@/lib/utils/format/date";
import { formatTokenCount, formatTokens } from "@/lib/utils/format/number";
import { ModelPriceMetas } from "../model-price-meta";
import { ModelPageLink } from "./model-page-link";
import { useLocale, useTranslations } from "next-intl";

export function ModelListCard(props: {
  model: PricingCatalogModel;
  rank?: RankedModel;
  onClick: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const model = props.model;
  const ctx = model.metadata?.contextWindow ?? model.metadata?.maxInputTokens;
  const released = model.release_ts;
  const category = model.tags.find(
    (tag) =>
      !["text", "image", "video", "audio", "embedding"].includes(
        tag.toLowerCase(),
      ),
  );

  return (
    // Not a <button>: it contains the model page link, and an <a> inside a
    // button is invalid HTML that crawlers and screen readers drop.
    <div
      role="button"
      tabIndex={0}
      onClick={props.onClick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onClick();
        }
      }}
      className="border-border/60 hover:bg-muted/30 w-full cursor-pointer border-b px-2 py-5 text-left transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <ModelCardTitle model={model} interceptLink />
        {props.rank && (
          <span className="text-muted-foreground shrink-0 font-mono text-sm">
            {formatTokens(props.rank.total_tokens, locale)}{" "}
            {t("MODELS.LIST.TOKENS")}
          </span>
        )}
      </div>

      {category && (
        <span className="text-muted-foreground mt-2 inline-flex items-center gap-1 font-mono text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          {category}
        </span>
      )}

      {model.description && (
        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
          {model.description}
        </p>
      )}

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        <span>
          {t("MODELS.LIST.BY")} {model.vendor}
        </span>
        {released > 0 && <span>{formatMsDate(released)}</span>}
        {ctx ? (
          <span>
            {formatTokenCount(ctx, locale)} {t("MODELS.LIST.CONTEXT")}
          </span>
        ) : null}
        <ModelPriceMetas model={model} />
      </div>
    </div>
  );
}

export function ModelCardTitle(props: {
  model: PricingCatalogModel;
  interceptLink?: boolean;
}) {
  const t = useTranslations();
  const model = props.model;
  const theme = getVendorTheme(model.vendor);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <VendorIcon vendor={model.vendor} size={22} />
      <ModelPageLink
        model={model}
        intercept={props.interceptLink}
        className="truncate text-lg font-medium"
      >
        {model.model_name}
      </ModelPageLink>
      <span
        className={cn(
          "shrink-0 rounded px-1 py-0.5 font-mono text-[10px] uppercase",
          theme.tagBg,
          theme.text,
        )}
      >
        {model.type.charAt(0)}
      </span>
      {model.is_free && (
        <Icon
          name="gift"
          className="h-4 w-4 shrink-0 text-emerald-500"
          aria-label={t("MODELS.TABLE.FREE")}
        />
      )}
      <OwnPurposeBadge ownPurpose={model.own_purpose} />
      {isFlatVariant(model) && (
        <span
          className="text-muted-foreground/70 flex shrink-0 items-center"
          aria-label={t("MODELS.TABLE.FLAT_NO_PARAMS")}
          title={t("MODELS.TABLE.FLAT_NO_PARAMS")}
        >
          <Icon name="circle-help" className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
