"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import {
  useDeleteTest,
  useHistoryModelTests,
} from "@/hooks/ai/model-tester/tester-hooks";
import { Link } from "@/i18n/navigation";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { RankPill } from "./rank-bar";
import type { TestListItem } from "@/lib/db/client/data/tester";
import type { TranslationKey } from "@/lib/types";

const VERDICT_BADGE: Record<string, "default" | "destructive" | "secondary"> = {
  genuine: "default",
  suspicious: "destructive",
  unverified: "secondary",
};
const VERDICT_KEY: Record<string, TranslationKey> = {
  genuine: "MODEL_TESTER.VERDICT.GENUINE",
  suspicious: "MODEL_TESTER.VERDICT.SUSPICIOUS",
  unverified: "MODEL_TESTER.VERDICT.UNVERIFIED",
};

export function HistoryModelTests(props: { host: string; model: string }) {
  const t = useTranslations();
  const testsQuery = useHistoryModelTests(props.host, props.model);
  const deleteTest = useDeleteTest();
  const rows = testsQuery.data ?? [];

  async function onDelete(row: TestListItem) {
    const ok = await confirm({
      title: t("MODEL_TESTER.HISTORY.DELETE_TITLE"),
      description: t("MODEL_TESTER.HISTORY.DELETE_BODY"),
      confirmLabel: t("MODEL_TESTER.HISTORY.DELETE_CONFIRM"),
      cancelLabel: t("MODEL_TESTER.HISTORY.DELETE_CANCEL"),
      destructive: true,
    });
    if (ok) deleteTest.mutate(row.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={{
          pathname: "/ai-api-model-tester/history/provider/[host]",
          params: { host: encodeURIComponent(props.host) },
        }}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm transition-colors"
      >
        <Icon name="arrow-left" className="size-4" />
        {t("MODEL_TESTER.DETAIL.BACK_TO_PROVIDER")}
      </Link>

      <section className="bg-card overflow-hidden rounded-lg border">
        <header className="flex flex-col gap-0.5 border-b px-5 py-4">
          <span className="text-base font-semibold">{props.model}</span>
          <span className="text-muted-foreground text-xs">{props.host}</span>
        </header>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {t("MODEL_TESTER.HISTORY.EMPTY")}
          </p>
        ) : (
          <div className="divide-border divide-y">
            {rows.map((row, i) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <RankPill rank={i + 1} />
                <Link
                  href={{
                    pathname: "/ai-api-model-tester/history/[id]",
                    params: { id: row.id },
                  }}
                  className="flex min-w-0 flex-1 flex-col gap-1"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Badge variant={VERDICT_BADGE[row.verdict] ?? "secondary"}>
                      {t(
                        VERDICT_KEY[row.verdict] ??
                          "MODEL_TESTER.VERDICT.UNVERIFIED",
                      )}
                    </Badge>
                    <span className="text-muted-foreground">
                      {row.probesPassed}/{row.probesTotal}
                    </span>
                    {row.publishedAt ? (
                      <Icon
                        name="cloud-upload"
                        className="text-muted-foreground size-3.5"
                      />
                    ) : null}
                  </span>
                  <span className="text-muted-foreground truncate font-mono text-[11px] tabular-nums">
                    {Math.round(row.latencyMs)}ms ·{" "}
                    {dayjs(row.testedAt).fromNow()}
                  </span>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(row)}
                >
                  <Icon name="trash-2" className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
