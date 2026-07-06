import { Icon } from "@/components/ui/icon";
import type { ModelMetadata } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { formatTokenCount } from "@/lib/utils/format/number";
import { formatYearMonth } from "@/lib/utils/format/date";
import { getTranslations } from "next-intl/server";
import { deriveCapabilityChips } from "./capability-helpers";
import { ModelModalityChip } from "./model-modality-chip";

// ePhone-style compact chip row: context/output token limits first, then the
// capability chips (reasoning/tools/vision/...), each with its lucide icon.
export async function ModelHeaderChips(props: {
  metadata: ModelMetadata;
  locale: string;
}) {
  const t = await getTranslations();
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
          {formatTokenCount(ctx, props.locale)}{" "}
          <span className="text-muted-foreground">
            {t("MODEL_PAGE.CHIP_CONTEXT")}
          </span>
        </span>
      ) : null}
      {out ? (
        <span className={chip}>
          <Icon name="zap" className="h-3 w-3 opacity-70" />
          {formatTokenCount(out, props.locale)}{" "}
          <span className="text-muted-foreground">
            {t("MODEL_PAGE.CHIP_OUT")}
          </span>
        </span>
      ) : null}
      {caps.map((cap) => (
        <span key={cap.labelKey} className={cn(chip)}>
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

// Secondary metadata (mode/tokenizer/reasoning-levels/moderated) as a dim inline
// row, rendered below the description so it doesn't crowd the capability chips.
export async function ModelMetaStats(props: { metadata: ModelMetadata }) {
  const t = await getTranslations();
  const meta = props.metadata;
  const reasoningLevels = meta.reasoningEfforts ?? [];
  const deprecationDate = formatYearMonth(meta.deprecationDate);
  const expirationDate = formatYearMonth(meta.expirationDate);
  const quantization =
    meta.quantization && meta.quantization.toLowerCase() !== "unknown"
      ? meta.quantization
      : null;
  const metaItem = "inline-flex items-center gap-1.5";
  const metaValue = "text-foreground/80";

  const hasStats =
    !!meta.mode ||
    !!meta.tokenizer ||
    meta.isModerated === true ||
    reasoningLevels.length > 0 ||
    !!deprecationDate ||
    !!expirationDate ||
    !!quantization ||
    !!meta.huggingFaceId;
  if (!hasStats) return null;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px]">
      {meta.mode ? (
        <span className={metaItem}>
          <Icon name="message-square" className="h-3 w-3" />
          {t("MODELS.DETAIL.MODE")} <span className={metaValue}>{meta.mode}</span>
        </span>
      ) : null}
      {meta.tokenizer ? (
        <span className={metaItem}>
          <Icon name="file-text" className="h-3 w-3" />
          {t("MODELS.DETAIL.TOKENIZER")}{" "}
          <span className={metaValue}>{meta.tokenizer}</span>
        </span>
      ) : null}
      {reasoningLevels.length > 0 ? (
        <span className={metaItem}>
          <Icon name="brain" className="h-3 w-3" />
          {t("MODELS.DETAIL.REASONING_LEVELS")}{" "}
          <span className={metaValue}>{reasoningLevels.join(", ")}</span>
        </span>
      ) : null}
      {meta.isModerated === true ? (
        <span className={metaItem}>
          <Icon name="shield-check" className="h-3 w-3" />
          {t("MODELS.DETAIL.MODERATED")}
        </span>
      ) : null}
      {quantization ? (
        <span className={metaItem}>
          <Icon name="file-text" className="h-3 w-3" />
          {t("MODELS.DETAIL.QUANTIZATION")}{" "}
          <span className={metaValue}>{quantization}</span>
        </span>
      ) : null}
      {deprecationDate ? (
        <span className={metaItem}>
          <Icon name="triangle-alert" className="h-3 w-3" />
          {t("MODELS.DETAIL.DEPRECATION")}{" "}
          <span className={metaValue}>{deprecationDate}</span>
        </span>
      ) : null}
      {expirationDate ? (
        <span className={metaItem}>
          <Icon name="clock" className="h-3 w-3" />
          {t("MODELS.DETAIL.EXPIRATION")}{" "}
          <span className={metaValue}>{expirationDate}</span>
        </span>
      ) : null}
      {meta.huggingFaceId ? (
        <a
          href={`https://huggingface.co/${meta.huggingFaceId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(metaItem, "hover:text-foreground underline-offset-4 hover:underline")}
        >
          <Icon name="external-link" className="h-3 w-3" />
          <span className={metaValue}>{meta.huggingFaceId}</span>
        </a>
      ) : null}
    </div>
  );
}
