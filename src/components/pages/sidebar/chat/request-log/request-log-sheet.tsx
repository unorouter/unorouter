"use client";

import ShikiHighlighter from "react-shiki";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
import { env } from "@/lib/config/env";
import { readLocalRequestLog } from "@/lib/db/client/data/request-log";
import { queryKeys } from "@/lib/react-query/keys";
import { copyToClipboard } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";

function formatJson(value: unknown): string {
  return value == null ? "" : JSON.stringify(value, null, 2);
}

function buildCurl(row: {
  requestBody: unknown;
  requestId: string | null;
}): string {
  const body =
    typeof row.requestBody === "string"
      ? row.requestBody
      : JSON.stringify(row.requestBody);
  const headers = ['-H "Content-Type: application/json"'];
  if (row.requestId) headers.push(`-H "x-request-id: ${row.requestId}"`);
  return [
    `curl ${env.apiUrl}/v1/chat/completions`,
    ...headers.map((h) => `  ${h}`),
    `  -d '${body.replace(/'/g, "'\\''")}'`,
  ].join(" \\\n");
}

function Highlight(props: { code: string; language?: string }) {
  return (
    <ShikiHighlighter
      language={props.language ?? "json"}
      theme={{ dark: "vitesse-dark", light: "vitesse-light" }}
      addDefaultStyles={false}
      showLanguage={false}
      defaultColor="light-dark()"
      className="[&_pre]:border-border/50 [&_pre]:bg-muted/30 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:p-3 [&_pre]:text-xs [&_pre]:leading-relaxed"
    >
      {props.code}
    </ShikiHighlighter>
  );
}

function CopyButton(props: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        copyToClipboard(props.value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      <Icon name={copied ? "check" : "copy"} />
      {copied ? t("CHAT.REQUEST_LOG.COPIED") : props.label}
    </Button>
  );
}

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
      <SheetContent className="!max-w-4xl !w-[min(90vw,56rem)] overflow-hidden">
        <SheetHeader>
          <SheetTitle>{t("CHAT.REQUEST_LOG.TITLE")}</SheetTitle>
          <SheetDescription>{props.msgId}</SheetDescription>
          {row && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {row.requestId && (
                <Badge variant="outline">req: {row.requestId}</Badge>
              )}
              {row.inputTokens != null && (
                <Badge variant="outline">in: {row.inputTokens}</Badge>
              )}
              {row.outputTokens != null && (
                <Badge variant="outline">out: {row.outputTokens}</Badge>
              )}
              {row.cost != null && (
                <Badge variant="outline">${row.cost.toFixed(6)}</Badge>
              )}
              {row.durationMs != null && (
                <Badge variant="outline">{row.durationMs}ms</Badge>
              )}
              {row.tokensPerSecond != null && (
                <Badge variant="outline">
                  {row.tokensPerSecond.toFixed(1)} tok/s
                </Badge>
              )}
              {row.droppedParams && (
                <Badge variant="destructive">
                  dropped: {row.droppedParams}
                </Badge>
              )}
            </div>
          )}
          {row && (
            <div className="mt-2 flex gap-2">
              <CopyButton
                value={buildCurl(row)}
                label={t("CHAT.REQUEST_LOG.COPY_CURL")}
              />
              <CopyButton
                value={formatJson(row)}
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
          <Tabs defaultValue="request" className="flex min-h-0 flex-1 flex-col px-4 pb-4">
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
              <Highlight
                code={row.assembledSystem ?? ""}
                language="markdown"
              />
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
