"use client";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { ModelMetadata } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { formatTokenCount } from "@/lib/utils/base";
import { useTranslations } from "next-intl";

type Props = {
  metadata: ModelMetadata;
  className?: string;
};

function formatYearMonth(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year)) return value;
  if (!Number.isFinite(month)) return String(year);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString(undefined, { year: "numeric", month: "short" });
}

type Row = { label: string; value: React.ReactNode };

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

  const rows = [
    contextWindow !== undefined && {
      label: t("MODELS.DETAIL.CONTEXT_WINDOW"),
      value: formatTokenCount(contextWindow),
    },
    meta.maxOutputTokens !== undefined && {
      label: t("MODELS.DETAIL.MAX_OUTPUT"),
      value: formatTokenCount(meta.maxOutputTokens),
    },
    meta.mode && { label: t("MODELS.DETAIL.MODE"), value: meta.mode },
    meta.tokenizer && {
      label: t("MODELS.DETAIL.TOKENIZER"),
      value: meta.tokenizer,
    },
    knowledgeCutoff && {
      label: t("MODELS.DETAIL.KNOWLEDGE_CUTOFF"),
      value: knowledgeCutoff,
    },
    deprecationDate && {
      label: t("MODELS.DETAIL.DEPRECATION"),
      value: deprecationDate,
    },
    expirationDate && {
      label: t("MODELS.DETAIL.EXPIRATION"),
      value: expirationDate,
    },
    quantization && {
      label: t("MODELS.DETAIL.QUANTIZATION"),
      value: quantization,
    },
    meta.huggingFaceId && {
      label: t("MODELS.DETAIL.HUGGING_FACE"),
      value: (
        <a
          href={`https://huggingface.co/${meta.huggingFaceId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          {meta.huggingFaceId}
          <Icon name="external-link" className="h-2.5 w-2.5" />
        </a>
      ),
    },
    meta.isModerated === true && {
      label: t("MODELS.DETAIL.MODERATED"),
      value: (
        <Badge variant="outline" className="font-mono text-[10px]">
          {t("MODELS.DETAIL.MODERATED_YES")}
        </Badge>
      ),
    },
    meta.reasoningEfforts &&
      meta.reasoningEfforts.length > 0 && {
        label: t("MODELS.DETAIL.REASONING_LEVELS"),
        value: (
          <div className="flex flex-wrap gap-1">
            {meta.reasoningEfforts.map((effort) => (
              <Badge
                key={effort}
                variant="secondary"
                className="font-mono text-[10px]"
              >
                {effort}
              </Badge>
            ))}
          </div>
        ),
      },
  ].filter((r) => r !== false && r != null && r !== "") as Row[];

  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "border-border grid gap-x-4 gap-y-2 rounded-md border p-3 sm:grid-cols-2",
        props.className,
      )}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-3"
        >
          <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
            {row.label}
          </span>
          <span className="text-foreground font-mono text-xs">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
