"use client";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { ModelMetadata } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { formatTokenCount } from "@/lib/utils/format/number";
import { formatYearMonth } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type Props = {
  metadata: ModelMetadata;
  className?: string;
};

type LabeledRow = { label: string; value: ReactNode };

function row(
  condition: unknown,
  label: string,
  value: ReactNode,
): LabeledRow | null {
  return condition ? { label, value } : null;
}

export function QuickStats(props: Props) {
  const t = useTranslations();
  const meta = props.metadata;

  const contextWindow = meta.contextWindow ?? meta.maxInputTokens;
  const knowledgeCutoff = formatYearMonth(meta.knowledgeCutoff);
  const deprecationDate = formatYearMonth(meta.deprecationDate);
  const expirationDate = formatYearMonth(meta.expirationDate);
  const quantization =
    meta.quantization && meta.quantization.toLowerCase() !== "unknown"
      ? meta.quantization
      : null;
  const hasReasoning =
    meta.reasoningEfforts && meta.reasoningEfforts.length > 0;

  const rows = [
    row(
      contextWindow !== undefined,
      t("MODELS.DETAIL.CONTEXT_WINDOW"),
      contextWindow !== undefined ? formatTokenCount(contextWindow) : null,
    ),
    row(
      meta.maxOutputTokens !== undefined,
      t("MODELS.DETAIL.MAX_OUTPUT"),
      meta.maxOutputTokens !== undefined
        ? formatTokenCount(meta.maxOutputTokens)
        : null,
    ),
    row(meta.mode, t("MODELS.DETAIL.MODE"), meta.mode),
    row(meta.tokenizer, t("MODELS.DETAIL.TOKENIZER"), meta.tokenizer),
    row(knowledgeCutoff, t("MODELS.DETAIL.KNOWLEDGE_CUTOFF"), knowledgeCutoff),
    row(deprecationDate, t("MODELS.DETAIL.DEPRECATION"), deprecationDate),
    row(expirationDate, t("MODELS.DETAIL.EXPIRATION"), expirationDate),
    row(quantization, t("MODELS.DETAIL.QUANTIZATION"), quantization),
    row(
      meta.huggingFaceId,
      t("MODELS.DETAIL.HUGGING_FACE"),
      <a
        href={`https://huggingface.co/${meta.huggingFaceId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
      >
        {meta.huggingFaceId}
        <Icon name="external-link" className="h-2.5 w-2.5" />
      </a>,
    ),
    row(
      meta.isModerated === true,
      t("MODELS.DETAIL.MODERATED"),
      <Badge variant="outline" className="font-mono text-[10px]">
        {t("MODELS.DETAIL.MODERATED_YES")}
      </Badge>,
    ),
    row(
      hasReasoning,
      t("MODELS.DETAIL.REASONING_LEVELS"),
      <div className="flex flex-wrap gap-1">
        {(meta.reasoningEfforts ?? []).map((effort) => (
          <Badge
            key={effort}
            variant="secondary"
            className="font-mono text-[10px]"
          >
            {effort}
          </Badge>
        ))}
      </div>,
    ),
  ].filter((r): r is LabeledRow => r !== null);

  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "border-border grid gap-x-4 gap-y-2 rounded-md border p-3 sm:grid-cols-2",
        props.className,
      )}
    >
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-baseline justify-between gap-3"
        >
          <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
            {r.label}
          </span>
          <span className="text-foreground font-mono text-xs">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
