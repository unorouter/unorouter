"use client";

import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import {
  useDeleteTest,
  useHistoryModelTests,
} from "@/hooks/ai/model-tester/tester-hooks";
import { Link } from "@/i18n/navigation";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { ResultCardList } from "../shared/result-card-list";
import { toResultCardData } from "../shared/result-adapters";
import { TestResultCard } from "../shared/test-result-card";
import type { HistoryTestDetail } from "@/lib/db/client/data/tester/tester";

export function HistoryModelTests(props: { host: string; model: string }) {
  const t = useTranslations();
  const testsQuery = useHistoryModelTests(props.host, props.model);
  const deleteTest = useDeleteTest();
  const rows = testsQuery.data ?? [];

  async function onDelete(detail: HistoryTestDetail) {
    const ok = await confirm({
      title: t("MODEL_TESTER.HISTORY.DELETE_TITLE"),
      description: t("MODEL_TESTER.HISTORY.DELETE_BODY"),
      confirmLabel: t("MODEL_TESTER.HISTORY.DELETE_CONFIRM"),
      cancelLabel: t("MODEL_TESTER.HISTORY.DELETE_CANCEL"),
      destructive: true,
    });
    if (ok) deleteTest.mutate(detail.id);
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

      <ResultCardList
        items={rows}
        getKey={(detail) => detail.id}
        emptyLabel={t("MODEL_TESTER.HISTORY.EMPTY")}
        renderItem={(detail) => (
          <TestResultCard
            result={toResultCardData(detail)}
            timestamp={dayjs(detail.testedAt).fromNow()}
            onDelete={() => onDelete(detail)}
          />
        )}
      />

      {rows.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {t("MODEL_TESTER.DETAIL.LOCAL_ONLY")}
        </p>
      ) : null}
    </div>
  );
}
