"use client";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import {
  useDeleteTest,
  useTestDetail,
} from "@/hooks/ai/model-tester/tester-hooks";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { fromTestDetail } from "./result-adapters";
import { TestResultCard } from "./test-result-card";

export function ModelTestDetail(props: { id: string }) {
  const t = useTranslations();
  const router = useRouter();
  const detailQuery = useTestDetail(props.id);
  const deleteTest = useDeleteTest();
  const detail = detailQuery.data;

  if (!detail)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t("MODEL_TESTER.DETAIL.NOT_FOUND")}
      </p>
    );

  const backHref = {
    pathname: "/ai-api-model-tester/history/provider/[host]/[model]" as const,
    params: {
      host: encodeURIComponent(detail.provider.baseUrlHost),
      model: encodeURIComponent(detail.model.requestedModel),
    },
  };

  async function onDelete() {
    const ok = await confirm({
      title: t("MODEL_TESTER.HISTORY.DELETE_TITLE"),
      description: t("MODEL_TESTER.HISTORY.DELETE_BODY"),
      confirmLabel: t("MODEL_TESTER.HISTORY.DELETE_CONFIRM"),
      cancelLabel: t("MODEL_TESTER.HISTORY.DELETE_CANCEL"),
      destructive: true,
    });
    if (ok)
      deleteTest.mutate(props.id, {
        onSuccess: () => router.push("/ai-api-model-tester/history"),
      });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm transition-colors"
        >
          <Icon name="arrow-left" className="size-4" />
          {t("MODEL_TESTER.DETAIL.BACK_TO_MODEL")}
        </Link>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Icon name="trash-2" className="size-4" />
          {t("MODEL_TESTER.HISTORY.DELETE_CONFIRM")}
        </Button>
      </div>
      <TestResultCard result={fromTestDetail(detail)} />
      <p className="text-muted-foreground text-xs">
        {t("MODEL_TESTER.DETAIL.LOCAL_ONLY")}
      </p>
    </div>
  );
}
