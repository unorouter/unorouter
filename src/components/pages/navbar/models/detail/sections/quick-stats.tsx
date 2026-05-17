"use client";

import { Badge } from "@/components/ui/badge";
import type { ModelMetadata } from "@/lib/api/pricing";
import { formatTokenCount } from "@/lib/utils/base";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/ui/icon";

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

export function QuickStats(props: Props) {
  const t = useTranslations();
  const meta = props.metadata;

  const contextWindow = meta.contextWindow ?? meta.maxInputTokens;
  const knowledgeCutoff = formatYearMonth(meta.knowledgeCutoff);
  const deprecationDate = formatYearMonth(meta.deprecationDate);
  const expirationDate = formatYearMonth(meta.expirationDate);
  const showQuantization =
    meta.quantization && meta.quantization.toLowerCase() !== "unknown";

  const rows: { label: string; value: React.ReactNode }[] = [];

  if (contextWindow !== undefined) {
    rows.push({
      label: t("MODELS.DETAIL.CONTEXT_WINDOW"),
      value: formatTokenCount(contextWindow),
    });
  }
  if (meta.maxOutputTokens !== undefined) {
    rows.push({
      label: t("MODELS.DETAIL.MAX_OUTPUT"),
      value: formatTokenCount(meta.maxOutputTokens),
    });
  }
  if (meta.mode) {
    rows.push({ label: t("MODELS.DETAIL.MODE"), value: meta.mode });
  }
  if (meta.tokenizer) {
    rows.push({ label: t("MODELS.DETAIL.TOKENIZER"), value: meta.tokenizer });
  }
  if (knowledgeCutoff) {
    rows.push({
      label: t("MODELS.DETAIL.KNOWLEDGE_CUTOFF"),
      value: knowledgeCutoff,
    });
  }
  if (deprecationDate) {
    rows.push({
      label: t("MODELS.DETAIL.DEPRECATION"),
      value: deprecationDate,
    });
  }
  if (expirationDate) {
    rows.push({
      label: t("MODELS.DETAIL.EXPIRATION"),
      value: expirationDate,
    });
  }
  if (showQuantization) {
    rows.push({
      label: t("MODELS.DETAIL.QUANTIZATION"),
      value: meta.quantization,
    });
  }
  if (meta.huggingFaceId) {
    rows.push({
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
    });
  }
  if (meta.isModerated === true) {
    rows.push({
      label: t("MODELS.DETAIL.MODERATED"),
      value: (
        <Badge variant="outline" className="font-mono text-[10px]">
          {t("MODELS.DETAIL.MODERATED_YES")}
        </Badge>
      ),
    });
  }
  if (meta.reasoningEfforts && meta.reasoningEfforts.length > 0) {
    rows.push({
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
    });
  }

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
