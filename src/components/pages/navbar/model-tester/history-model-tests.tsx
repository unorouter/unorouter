"use client";

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
import { useState } from "react";
import { fromTestDetail } from "./result-adapters";
import { TestResultCard } from "./test-result-card";
import type { TestDetail } from "@/lib/db/client/data/tester";

const PAGE_SIZE = 5;

export function HistoryModelTests(props: { host: string; model: string }) {
  const t = useTranslations();
  const testsQuery = useHistoryModelTests(props.host, props.model);
  const deleteTest = useDeleteTest();
  const [page, setPage] = useState(0);
  const rows = testsQuery.data ?? [];

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  async function onDelete(detail: TestDetail) {
    const ok = await confirm({
      title: t("MODEL_TESTER.HISTORY.DELETE_TITLE"),
      description: t("MODEL_TESTER.HISTORY.DELETE_BODY"),
      confirmLabel: t("MODEL_TESTER.HISTORY.DELETE_CONFIRM"),
      cancelLabel: t("MODEL_TESTER.HISTORY.DELETE_CANCEL"),
      destructive: true,
    });
    if (ok) deleteTest.mutate(detail.test.id);
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

      <div className="flex flex-col gap-0.5">
        <span className="text-base font-semibold">{props.model}</span>
        <span className="text-muted-foreground text-xs">{props.host}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("MODEL_TESTER.HISTORY.EMPTY")}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {pageRows.map((detail) => (
              <TestResultCard
                key={detail.test.id}
                result={fromTestDetail(detail)}
                timestamp={dayjs(detail.test.testedAt).fromNow()}
                onDelete={() => onDelete(detail)}
              />
            ))}
          </div>

          {pageCount > 1 ? (
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <Icon name="chevron-left" className="size-4" />
                {t("MODEL_TESTER.DETAIL.PREV")}
              </Button>
              <span className="text-muted-foreground text-sm tabular-nums">
                {t("MODEL_TESTER.DETAIL.PAGE_OF", {
                  page: current + 1,
                  total: pageCount,
                })}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={current >= pageCount - 1}
                onClick={() => setPage(current + 1)}
              >
                {t("MODEL_TESTER.DETAIL.NEXT")}
                <Icon name="chevron-right" className="size-4" />
              </Button>
            </div>
          ) : null}

          <p className="text-muted-foreground text-xs">
            {t("MODEL_TESTER.DETAIL.LOCAL_ONLY")}
          </p>
        </>
      )}
    </div>
  );
}
