"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { confirm } from "@/components/ui/confirm";
import {
  useDeleteTest,
  useTestHistory,
} from "@/hooks/ai/model-tester/tester-hooks";
import { Link } from "@/i18n/navigation";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
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

export function HistoryTable() {
  const t = useTranslations();
  const historyQuery = useTestHistory();
  const deleteTest = useDeleteTest();
  const rows = historyQuery.data ?? [];

  if (rows.length === 0)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t("MODEL_TESTER.HISTORY.EMPTY")}
      </p>
    );

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
    <div className="bg-card flex flex-col divide-y overflow-hidden rounded-lg border px-5">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between gap-3 py-3"
        >
          <Link
            href={{
              pathname: "/ai-api-model-tester/history/[id]",
              params: { id: row.id },
            }}
            className="flex min-w-0 flex-col"
          >
            <span className="truncate font-medium">{row.requestedModel}</span>
            <span className="text-muted-foreground truncate text-sm">
              {row.baseUrlHost} · {dayjs(row.testedAt).fromNow()}
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={VERDICT_BADGE[row.verdict] ?? "secondary"}>
              {t(VERDICT_KEY[row.verdict] ?? "MODEL_TESTER.VERDICT.UNVERIFIED")}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {row.probesPassed}/{row.probesTotal}
            </span>
            <Button size="icon" variant="ghost" onClick={() => onDelete(row)}>
              <Icon name="trash-2" className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
