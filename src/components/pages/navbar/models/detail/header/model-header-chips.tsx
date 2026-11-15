"use client";

import { Icon } from "@/components/ui/icon";
import type { ModelMetadata } from "@/openapi";
import type { IconName } from "@/lib/config/icon-map";
import type { TranslationKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatTokenCount } from "@/lib/utils/format/number";
import { formatYearMonth } from "@/lib/utils/format/date";
import { useLocale, useTranslations } from "next-intl";
import { deriveCapabilityChips } from "./capability-helpers";
import { ModelModalityChip } from "./model-modality-chip";

export function ModelHeaderChips(props: { metadata: ModelMetadata }) {
  const t = useTranslations();
  const locale = useLocale();
  const meta = props.metadata;
  const ctx = meta.contextWindow ?? meta.maxInputTokens;
  const out = meta.maxOutputTokens;
  const caps = deriveCapabilityChips(meta);

  const chip =
    "border-border/50 bg-muted/30 text-foreground/90 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px]";

  const hasModality =
    (meta.inputModalities ?? []).length > 0 ||
    (meta.outputModalities ?? []).length > 0;
  if (!ctx && !out && caps.length === 0 && !hasModality) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ctx ? (
        <span className={chip}>
          <Icon name="clock" className="h-3 w-3 opacity-70" />
          {formatTokenCount(ctx, locale)}{" "}
          <span className="text-muted-foreground">
            {t("MODEL_PAGE.CHIP_CONTEXT")}
          </span>
        </span>
      ) : null}
      {out ? (
        <span className={chip}>
          <Icon name="zap" className="h-3 w-3 opacity-70" />
          {formatTokenCount(out, locale)}{" "}
          <span className="text-muted-foreground">
            {t("MODEL_PAGE.CHIP_OUT")}
          </span>
        </span>
      ) : null}
      {caps.map((cap) => (
        <span key={cap.labelKey} className={chip}>
          <Icon name={cap.icon} className="h-3 w-3 opacity-70" />
          {cap.count != null
            ? t(cap.labelKey, { count: cap.count })
            : t(cap.labelKey)}
        </span>
      ))}
      <ModelModalityChip metadata={meta} />
    </div>
  );
}

export function ModelMetaStats(props: { metadata: ModelMetadata }) {
  const t = useTranslations();
  const meta = props.metadata;
  const reasoningLevels = meta.reasoningEfforts ?? [];
  const deprecationDate = formatYearMonth(meta.deprecationDate);
  const expirationDate = formatYearMonth(meta.expirationDate);
  const quantization =
    meta.quantization && meta.quantization.toLowerCase() !== "unknown"
      ? meta.quantization
      : null;
  const metaItem = "inline-flex items-center gap-1.5";
  const items: [IconName, TranslationKey, string | null][] = [
    ["message-square", "MODELS.DETAIL.MODE", meta.mode || null],
    ["file-text", "MODELS.DETAIL.TOKENIZER", meta.tokenizer || null],
    [
      "brain",
      "MODELS.DETAIL.REASONING_LEVELS",
      reasoningLevels.join(", ") || null,
    ],
    [
      "shield-check",
      "MODELS.DETAIL.MODERATED",
      meta.isModerated === true ? "" : null,
    ],
    ["file-text", "MODELS.DETAIL.QUANTIZATION", quantization],
    ["triangle-alert", "MODELS.DETAIL.DEPRECATION", deprecationDate],
    ["clock", "MODELS.DETAIL.EXPIRATION", expirationDate],
  ];
  const shown = items.filter((item) => item[2] !== null);
  if (shown.length === 0 && !meta.huggingFaceId) return null;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px]">
      {shown.map((item) => (
        <span key={item[1]} className={metaItem}>
          <Icon name={item[0]} className="h-3 w-3" />
          {t(item[1])}{" "}
          {item[2] && <span className="text-foreground/80">{item[2]}</span>}
        </span>
      ))}
      {meta.huggingFaceId ? (
        <a
          href={`https://huggingface.co/${meta.huggingFaceId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            metaItem,
            "hover:text-foreground underline-offset-4 hover:underline",
          )}
        >
          <Icon name="external-link" className="h-3 w-3" />
          <span className="text-foreground/80">{meta.huggingFaceId}</span>
        </a>
      ) : null}
    </div>
  );
}
