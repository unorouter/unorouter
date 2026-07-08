"use client";

import { Icon } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBenchmarksQuery } from "@/hooks/models/benchmarks-hook";
import type {
  BenchLmResult,
  DesignArenaRow,
  LmArenaRow,
} from "@/lib/api/typebox/benchmarks";
import { getVendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../shared/section-heading";
import { StatusBox } from "../shared/status-box";
import { useLocale, useTranslations } from "next-intl";

type Props = {
  modelName: string;
  vendorName: string;
};

function useCategoryLabel(key: string): string {
  const t = useTranslations();
  switch (key) {
    case "coding":
      return t("MODEL_PAGE.BENCH_CAT_CODING");
    case "reasoning":
      return t("MODEL_PAGE.BENCH_CAT_REASONING");
    case "math":
      return t("MODEL_PAGE.BENCH_CAT_MATH");
    case "knowledge":
      return t("MODEL_PAGE.BENCH_CAT_KNOWLEDGE");
    case "agentic":
      return t("MODEL_PAGE.BENCH_CAT_AGENTIC");
    case "multilingual":
      return t("MODEL_PAGE.BENCH_CAT_MULTILINGUAL");
    case "instructionFollowing":
      return t("MODEL_PAGE.BENCH_CAT_INSTRUCTION");
    case "multimodalGrounded":
      return t("MODEL_PAGE.BENCH_CAT_MULTIMODAL");
    default:
      return key;
  }
}

type Theme = ReturnType<typeof getVendorTheme>;

export function BenchmarksSection(props: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const query = useBenchmarksQuery(props.modelName);
  const theme = getVendorTheme(props.vendorName);
  const data = query.data;

  if (query.isLoading) {
    return <StatusBox>{t("MODEL_PAGE.BENCH_LOADING")}</StatusBox>;
  }

  const hasAny =
    !!data &&
    ((data.lmarena?.length ?? 0) > 0 ||
      (data.benchlm?.categories.length ?? 0) > 0 ||
      (data.designArena?.length ?? 0) > 0);

  if (!hasAny) {
    return <StatusBox>{t("MODEL_PAGE.BENCH_EMPTY")}</StatusBox>;
  }

  return (
    <div className="flex flex-col gap-10">
      {data?.benchlm && data.benchlm.categories.length > 0 && (
        <BenchLmBlock result={data.benchlm} theme={theme} />
      )}
      {data?.lmarena && data.lmarena.length > 0 && (
        <LmArenaBlock rows={data.lmarena} theme={theme} locale={locale} />
      )}
      {data?.designArena && data.designArena.length > 0 && (
        <DesignArenaBlock rows={data.designArena} theme={theme} />
      )}
    </div>
  );
}

function BenchLmBlock(props: { result: BenchLmResult; theme: Theme }) {
  const t = useTranslations();
  return (
    <section>
      <SectionHeading theme={props.theme}>
        {t("MODEL_PAGE.BENCH_CATEGORIES")}
      </SectionHeading>
      <div className="flex flex-col gap-2.5">
        {props.result.overall != null && (
          <ScoreBar
            label={t("MODEL_PAGE.BENCH_OVERALL")}
            score={props.result.overall}
            theme={props.theme}
            accent
          />
        )}
        {props.result.categories.map((cat) => (
          <CategoryScoreBar
            key={cat.key}
            categoryKey={cat.key}
            score={cat.score}
            theme={props.theme}
          />
        ))}
      </div>
      <SourceFooter>{t("MODEL_PAGE.BENCH_SOURCE_BENCHLM")}</SourceFooter>
    </section>
  );
}

function CategoryScoreBar(props: {
  categoryKey: string;
  score: number;
  theme: Theme;
}) {
  const label = useCategoryLabel(props.categoryKey);
  return <ScoreBar label={label} score={props.score} theme={props.theme} />;
}

function ScoreBar(props: {
  label: string;
  score: number;
  theme: Theme;
  accent?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, props.score));
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "text-muted-foreground w-40 shrink-0 font-mono text-[11px] tracking-wider uppercase",
          props.accent && "text-foreground",
        )}
      >
        {props.label}
      </span>
      <div className="bg-muted/40 relative h-2 flex-1 overflow-hidden rounded-full">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            props.accent ? "bg-foreground" : "bg-muted-foreground/50",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-foreground w-12 shrink-0 text-right font-mono text-xs tabular-nums">
        {props.score.toFixed(1)}
      </span>
    </div>
  );
}

function LmArenaBlock(props: {
  rows: LmArenaRow[];
  theme: Theme;
  locale: string;
}) {
  const t = useTranslations();
  const sorted = [...props.rows].sort((a, b) => a.rank - b.rank);
  return (
    <section>
      <SectionHeading theme={props.theme}>
        {t("MODEL_PAGE.BENCH_ARENA")}
      </SectionHeading>
      <div className="overflow-x-auto rounded-md border">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {(
                [
                  "MODEL_PAGE.BENCH_BOARD",
                  "MODEL_PAGE.BENCH_RANK",
                  "MODEL_PAGE.BENCH_SCORE",
                  "MODEL_PAGE.BENCH_VOTES",
                ] as const
              ).map((key, i) => (
                <TableHead
                  key={key}
                  className={cn(
                    "text-muted-foreground h-9 text-[10px] tracking-wider uppercase",
                    i > 0 && "text-right",
                  )}
                >
                  {t(key)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.board}>
                <TableCell className="py-2 font-mono text-xs capitalize">
                  {row.board}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  #{row.rank}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-2 text-right font-mono text-xs font-medium",
                    props.theme.text,
                  )}
                >
                  {row.score}
                </TableCell>
                <TableCell className="text-muted-foreground py-2 text-right font-mono text-xs">
                  {row.votes.toLocaleString(props.locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <SourceFooter>{t("MODEL_PAGE.BENCH_SOURCE_ARENA")}</SourceFooter>
    </section>
  );
}

function DesignArenaBlock(props: { rows: DesignArenaRow[]; theme: Theme }) {
  const t = useTranslations();
  const byCategory = new Map<string, DesignArenaRow>();
  for (const row of props.rows) {
    const existing = byCategory.get(row.category);
    if (!existing || row.elo > existing.elo) byCategory.set(row.category, row);
  }
  const rows = [...byCategory.values()]
    .sort((a, b) => b.elo - a.elo)
    .slice(0, 8);
  return (
    <section>
      <SectionHeading theme={props.theme}>
        {t("MODEL_PAGE.BENCH_DESIGN_ARENA")}
      </SectionHeading>
      <div className="overflow-x-auto rounded-md border">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {(
                [
                  "MODEL_PAGE.BENCH_BOARD",
                  "MODEL_PAGE.BENCH_ELO",
                  "MODEL_PAGE.BENCH_WIN_RATE",
                  "MODEL_PAGE.BENCH_PERCENTILE",
                ] as const
              ).map((key, i) => (
                <TableHead
                  key={key}
                  className={cn(
                    "text-muted-foreground h-9 text-[10px] tracking-wider uppercase",
                    i > 0 && "text-right",
                  )}
                >
                  {t(key)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.category}>
                <TableCell className="py-2 font-mono text-xs capitalize">
                  {row.category}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-2 text-right font-mono text-xs font-medium",
                    props.theme.text,
                  )}
                >
                  {row.elo}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  {row.winRate.toFixed(1)}%
                </TableCell>
                <TableCell className="text-muted-foreground py-2 text-right font-mono text-xs">
                  {row.percentile}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <SourceFooter>{t("MODEL_PAGE.BENCH_SOURCE_DESIGN")}</SourceFooter>
    </section>
  );
}

function SourceFooter(props: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground/60 mt-2 flex items-center gap-1.5 font-mono text-[10px]">
      <Icon name="info" className="h-3 w-3" />
      {props.children}
    </p>
  );
}
