import { Icon } from "@/components/ui/icon";
import type { ModelMetadata } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { formatTokenCount } from "@/lib/utils/format/number";
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
  const reasoningLevels = meta.reasoningEfforts ?? [];

  const chip = "border-border/60 bg-muted/40 inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px]";
  const chipLabel = "text-muted-foreground";

  const hasModality =
    (meta.inputModalities ?? []).length > 0 ||
    (meta.outputModalities ?? []).length > 0;
  const hasStats =
    !!meta.mode ||
    !!meta.tokenizer ||
    meta.isModerated === true ||
    reasoningLevels.length > 0;
  if (!ctx && !out && caps.length === 0 && !hasModality && !hasStats)
    return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ctx ? (
        <span className={chip}>
          <Icon name="clock" className="h-3 w-3" />
          {formatTokenCount(ctx, props.locale)} {t("MODEL_PAGE.CHIP_CONTEXT")}
        </span>
      ) : null}
      {out ? (
        <span className={chip}>
          <Icon name="zap" className="h-3 w-3" />
          {formatTokenCount(out, props.locale)} {t("MODEL_PAGE.CHIP_OUT")}
        </span>
      ) : null}
      {caps.map((cap) => (
        <span key={cap.labelKey} className={cn(chip)}>
          <Icon name={cap.icon} className="h-3 w-3" />
          {cap.count != null ? t(cap.labelKey, { count: cap.count }) : t(cap.labelKey)}
        </span>
      ))}
      <ModelModalityChip metadata={meta} />
      {meta.mode ? (
        <span className={chip}>
          <Icon name="message-square" className="h-3 w-3" />
          <span className={chipLabel}>{t("MODELS.DETAIL.MODE")}</span>
          {meta.mode}
        </span>
      ) : null}
      {meta.tokenizer ? (
        <span className={chip}>
          <Icon name="file-text" className="h-3 w-3" />
          <span className={chipLabel}>{t("MODELS.DETAIL.TOKENIZER")}</span>
          {meta.tokenizer}
        </span>
      ) : null}
      {reasoningLevels.length > 0 ? (
        <span className={chip}>
          <Icon name="brain" className="h-3 w-3" />
          <span className={chipLabel}>{t("MODELS.DETAIL.REASONING_LEVELS")}</span>
          {reasoningLevels.join(", ")}
        </span>
      ) : null}
      {meta.isModerated === true ? (
        <span className={chip}>
          <Icon name="shield-check" className="h-3 w-3" />
          {t("MODELS.DETAIL.MODERATED")}
        </span>
      ) : null}
    </div>
  );
}
