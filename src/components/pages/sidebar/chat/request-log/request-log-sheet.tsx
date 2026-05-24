"use client";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Highlight } from "@/components/elements/code/highlight";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  buildRequestLogCurl,
  readLocalRequestLog,
} from "@/lib/db/client/data/request-log";
import { queryKeys } from "@/lib/react-query/keys";
import { formatJson } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export function RequestLogSheet(props: {
  msgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const auth = useAuthQuery();
  const userId = auth.data?.id ?? GUEST_USER_ID;

  const log = useQuery({
    queryKey: queryKeys.requestLog(props.msgId),
    queryFn: () => readLocalRequestLog(userId, props.msgId),
    enabled: props.open,
  });

  const row = log.data;

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="w-[min(90vw,56rem)]! max-w-4xl! overflow-hidden">
        <SheetHeader>
          <SheetTitle>{t("CHAT.REQUEST_LOG.TITLE")}</SheetTitle>
          <SheetDescription>{props.msgId}</SheetDescription>
          {row && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {row.requestId && (
                <Badge variant="outline">
                  {t("CHAT.REQUEST_LOG.BADGE_REQ")}: {row.requestId}
                </Badge>
              )}
              {row.inputTokens != null && (
                <Badge variant="outline">
                  {t("CHAT.REQUEST_LOG.BADGE_IN")}: {row.inputTokens}
                </Badge>
              )}
              {row.outputTokens != null && (
                <Badge variant="outline">
                  {t("CHAT.REQUEST_LOG.BADGE_OUT")}: {row.outputTokens}
                </Badge>
              )}
              {row.cost != null && (
                <Badge variant="outline">${row.cost.toFixed(6)}</Badge>
              )}
              {row.durationMs != null && (
                <Badge variant="outline">
                  {row.durationMs}
                  {t("CHAT.REQUEST_LOG.UNIT_MS")}
                </Badge>
              )}
              {row.tokensPerSecond != null && (
                <Badge variant="outline">
                  {row.tokensPerSecond.toFixed(1)}{" "}
                  {t("CHAT.REQUEST_LOG.UNIT_TOK_PER_S")}
                </Badge>
              )}
              {row.droppedParams && (
                <Badge variant="destructive">
                  {t("CHAT.REQUEST_LOG.BADGE_DROPPED")}: {row.droppedParams}
                </Badge>
              )}
            </div>
          )}
          {row && (
            <div className="mt-2 flex gap-2">
              <CopyButton
                text={buildRequestLogCurl(row)}
                label={t("CHAT.REQUEST_LOG.COPY_CURL")}
              />
              <CopyButton
                text={formatJson(row)}
                label={t("CHAT.REQUEST_LOG.COPY_JSON")}
              />
            </div>
          )}
        </SheetHeader>

        {!row ? (
          <div className="text-muted-foreground p-4 text-sm">
            {t("CHAT.REQUEST_LOG.NO_LOG")}
          </div>
        ) : (
          <Tabs
            defaultValue="request"
            className="flex min-h-0 flex-1 flex-col px-4 pb-4"
          >
            <TabsList>
              <TabsTrigger value="request">
                {t("CHAT.REQUEST_LOG.TAB_REQUEST")}
              </TabsTrigger>
              <TabsTrigger value="system">
                {t("CHAT.REQUEST_LOG.TAB_SYSTEM")}
              </TabsTrigger>
              <TabsTrigger value="final">
                {t("CHAT.REQUEST_LOG.TAB_FINAL")}
              </TabsTrigger>
              <TabsTrigger value="headers">
                {t("CHAT.REQUEST_LOG.TAB_HEADERS")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="request" className="min-h-0 overflow-auto">
              <Highlight code={formatJson(row.requestBody)} />
            </TabsContent>
            <TabsContent value="system" className="min-h-0 overflow-auto">
              <Highlight code={row.assembledSystem ?? ""} language="markdown" />
            </TabsContent>
            <TabsContent value="final" className="min-h-0 overflow-auto">
              <Highlight code={formatJson(row.finalMessages)} />
            </TabsContent>
            <TabsContent value="headers" className="min-h-0 overflow-auto">
              <Highlight code={formatJson(row.responseHeaders)} />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
