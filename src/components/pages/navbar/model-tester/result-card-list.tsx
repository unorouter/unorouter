"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ReactNode } from "react";

const DEFAULT_PAGE_SIZE = 5;

export function ResultCardList<T>(props: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, rank: number) => ReactNode;
  emptyLabel: string;
  pageSize?: number;
}) {
  const t = useTranslations();
  const pageSize = props.pageSize ?? DEFAULT_PAGE_SIZE;
  const [page, setPage] = useState(0);

  if (props.items.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {props.emptyLabel}
      </p>
    );
  }

  const pageCount = Math.max(1, Math.ceil(props.items.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageItems = props.items.slice(
    current * pageSize,
    current * pageSize + pageSize,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        {pageItems.map((item, i) => (
          <div key={props.getKey(item)}>
            {props.renderItem(item, current * pageSize + i + 1)}
          </div>
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
    </div>
  );
}
