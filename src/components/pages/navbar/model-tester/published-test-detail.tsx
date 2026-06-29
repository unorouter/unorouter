"use client";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  useDeletePublishedTest,
  usePublishedTestDetail,
} from "@/hooks/models/model-tester-rankings-hook";
import { Link, useRouter } from "@/i18n/navigation";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { useTranslations } from "next-intl";
import {
  fromPublishedTestDetail,
  type PublishedTestDetailData,
} from "./result-adapters";
import { TestResultCard } from "./test-result-card";

export function PublishedTestDetail(props: {
  host: string;
  model: string;
  testId: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const userId = useLocalUserId();
  const detailQuery = usePublishedTestDetail(props.testId);
  const detail = detailQuery.data as PublishedTestDetailData | null | undefined;
  const deletePublished = useDeletePublishedTest(props.host, props.model);

  const backHref = {
    pathname: "/ai-api-model-tester/rankings/[host]/[model]" as const,
    params: {
      host: encodeURIComponent(props.host),
      model: encodeURIComponent(props.model),
    },
  };

  if (detailQuery.isLoading)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t("MODEL_TESTER.DETAIL.LOADING")}
      </p>
    );

  if (!detail)
    return (
      <div className="flex flex-col gap-4">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm transition-colors"
        >
          <Icon name="arrow-left" className="size-4" />
          {t("MODEL_TESTER.DETAIL.BACK_TO_MODEL")}
        </Link>
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("MODEL_TESTER.DETAIL.NOT_FOUND")}
        </p>
      </div>
    );

  const mine = detailMine(detail, userId);

  async function onDelete() {
    const ok = await confirm({
      title: t("MODEL_TESTER.DETAIL.DELETE_TITLE"),
      description: t("MODEL_TESTER.DETAIL.DELETE_BODY"),
      confirmLabel: t("MODEL_TESTER.DETAIL.DELETE_CONFIRM"),
      cancelLabel: t("MODEL_TESTER.DETAIL.DELETE_CANCEL"),
      destructive: true,
    });
    if (ok)
      deletePublished.mutate(props.testId, {
        onSuccess: () => router.push(backHref),
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
        {mine ? (
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Icon name="trash-2" className="size-4" />
            {t("MODEL_TESTER.DETAIL.DELETE_MINE")}
          </Button>
        ) : null}
      </div>
      <TestResultCard result={fromPublishedTestDetail(detail)} />
      <p className="text-muted-foreground text-xs">
        {t("MODEL_TESTER.DETAIL.PUBLISHED_NOTE")}
      </p>
    </div>
  );
}

// The server detail carries submitterUserId on the test row; allow self-delete.
function detailMine(
  detail: PublishedTestDetailData,
  userId: number,
): boolean {
  const sub = detail.test.submitterUserId;
  return sub != null && sub !== GUEST_USER_ID && sub === userId;
}
