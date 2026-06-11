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
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { useUsedProviderQuery } from "@/hooks/ops/logs-hook";
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
  const userId = useLocalUserId();

  const log = useQuery({
    queryKey: queryKeys.requestLog(props.msgId),
    queryFn: () => readLocalRequestLog(userId, props.msgId),
    enabled: props.open,
  });

  const row = log.data;
  // Provider that actually served the request (new-api logs by request_id): auto-group
  // routing picks the cheapest satisfied channel, this surfaces which one, after the fact.
  const usedProvider = useUsedProviderQuery(row?.requestId).data;

  // Exact OpenAI-compatible wire body the upstream receives; this is the
  // verification surface testers need. Raw client snapshot is debug-only, last.
  const upstreamBody = row
    ? {
        model:
          row.requestBody && typeof row.requestBody === "object"
            ? (row.requestBody as { model?: string }).model
            : undefined,
        ...(row.assembledSystem ? { system: row.assembledSystem } : {}),
        messages: row.finalMessages,
      }
    : null;

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
              {usedProvider && (
                <Badge variant="outline">
                  {t("CHAT.REQUEST_LOG.BADGE_PROVIDER")}: {usedProvider}
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
            defaultValue="upstream"
            className="flex min-h-0 flex-1 flex-col px-4 pb-4"
          >
            <TabsList>
              <TabsTrigger value="upstream">
                {t("CHAT.REQUEST_LOG.TAB_UPSTREAM")}
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
              <TabsTrigger value="request">
                {t("CHAT.REQUEST_LOG.TAB_REQUEST")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upstream" className="min-h-0 overflow-auto">
              <p className="text-muted-foreground mb-2 text-xs">
                {t("CHAT.REQUEST_LOG.TAB_UPSTREAM_HINT")}
              </p>
              <Highlight code={formatJson(upstreamBody)} />
            </TabsContent>
            <TabsContent value="system" className="min-h-0 overflow-auto">
              <p className="text-muted-foreground mb-2 text-xs">
                {t("CHAT.REQUEST_LOG.TAB_SYSTEM_HINT")}
              </p>
              <Highlight code={row.assembledSystem ?? ""} language="markdown" />
            </TabsContent>
            <TabsContent value="final" className="min-h-0 overflow-auto">
              <p className="text-muted-foreground mb-2 text-xs">
                {t("CHAT.REQUEST_LOG.TAB_FINAL_HINT")}
              </p>
              <Highlight code={formatJson(row.finalMessages)} />
            </TabsContent>
            <TabsContent value="headers" className="min-h-0 overflow-auto">
              <Highlight code={formatJson(row.responseHeaders)} />
            </TabsContent>
            <TabsContent value="request" className="min-h-0 overflow-auto">
              <p className="text-muted-foreground mb-2 text-xs">
                {t("CHAT.REQUEST_LOG.TAB_REQUEST_HINT")}
              </p>
              <Highlight code={formatJson(row.requestBody)} />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
