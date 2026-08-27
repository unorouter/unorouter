"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import {
  MAX_REQUEST_LOGS,
  readRequestLogList,
} from "@/lib/db/client/data/chat/request-log";
import { queryKeys } from "@/lib/react-query/keys";
import { dayjs } from "@/lib/utils/format/date";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequestLogSheet } from "./request-log-sheet";

const DASH = "-";

export function RequestLogListSheet(props: {
  convId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const [detailMsgId, setDetailMsgId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: queryKeys.requestLogList(props.convId),
    queryFn: () => readRequestLogList(props.convId),
    enabled: props.open,
  });

  const rows = list.data ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      in: acc.in + (r.inputTokens ?? 0),
      out: acc.out + (r.outputTokens ?? 0),
      cost: acc.cost + (r.cost ?? 0),
    }),
    { in: 0, out: 0, cost: 0 },
  );

  return (
    <>
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="flex w-[min(95vw,64rem)]! max-w-5xl! flex-col overflow-hidden max-md:h-[90dvh]! max-md:w-full!"
        >
          <SheetHeader>
            <SheetTitle>{t("CHAT.REQUEST_LOG.LIST_TITLE")}</SheetTitle>
            <SheetDescription>
              {t("CHAT.REQUEST_LOG.LIST_SUMMARY", {
                count: rows.length,
                in: totals.in,
                out: totals.out,
                cost: totals.cost.toFixed(4),
              })}
            </SheetDescription>
            {/* Older rows are deleted outright, not trimmed, so a full-looking
                list would misreport how many messages the chat really has. */}
            {rows.length >= MAX_REQUEST_LOGS && (
              <p className="text-muted-foreground text-xs">
                {t("CHAT.REQUEST_LOG.LIST_CAPPED", {
                  max: MAX_REQUEST_LOGS,
                })}
              </p>
            )}
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
            {rows.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                {t("CHAT.REQUEST_LOG.LIST_EMPTY")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("CHAT.REQUEST_LOG.COL_TIME")}</TableHead>
                    <TableHead>{t("CHAT.REQUEST_LOG.COL_MODEL")}</TableHead>
                    <TableHead>
                      {t("CHAT.REQUEST_LOG.BADGE_PROVIDER")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("CHAT.REQUEST_LOG.BADGE_IN")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("CHAT.REQUEST_LOG.BADGE_OUT")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("CHAT.REQUEST_LOG.COL_COST")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("CHAT.REQUEST_LOG.UNIT_MS")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.msgId}
                      className="hover:bg-accent cursor-pointer"
                      onClick={() => setDetailMsgId(row.msgId)}
                    >
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {row.createdAt
                          ? dayjs(row.createdAt).format("MMM D HH:mm")
                          : DASH}
                      </TableCell>
                      {/* Retention blanks request_body on older rows, so the
                          model it carried is gone while the columns beside it
                          survive. */}
                      <TableCell className="max-w-40 truncate">
                        {row.model ?? DASH}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {row.channelName ?? DASH}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.inputTokens ?? DASH}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.outputTokens ?? DASH}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.cost != null ? row.cost.toFixed(6) : DASH}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.durationMs ?? DASH}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {detailMsgId && (
        <RequestLogSheet
          msgId={detailMsgId}
          open={!!detailMsgId}
          onOpenChange={(open) => !open && setDetailMsgId(null)}
        />
      )}
    </>
  );
}
