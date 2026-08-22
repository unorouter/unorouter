"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { renderQuota } from "@/lib/config/constants";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  formatPriceCompact,
  formatTimestamp,
  getClientAttribution,
  parseOther,
  type LogRow,
} from "./log-helpers";

export function LogDetailsDialog(props: {
  log: LogRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const log = props.log;
  if (!log) {
    return (
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const other = parseOther(log.other);
  const client = getClientAttribution(other);
  const modelRatio = other?.model_ratio ?? 0;
  const completionRatio = other?.completion_ratio ?? 1;
  const cacheRatio = other?.cache_ratio;
  const cacheCreationRatio = other?.cache_creation_ratio;
  const groupRatio = other?.user_group_ratio ?? other?.group_ratio;
  const billingMode = other?.billing_mode;
  const matchedTier = other?.matched_tier;

  const inputPrice = modelRatio * 2;
  const outputPrice = inputPrice * completionRatio;
  const cacheReadPrice = cacheRatio != null ? inputPrice * cacheRatio : null;
  const cacheCreatePrice =
    cacheCreationRatio != null ? inputPrice * cacheCreationRatio : null;

  const tierLabel =
    billingMode === "tiered_expr"
      ? t("LOGS.PRICING.TIERED")
      : t("LOGS.PRICING.STANDARD");

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("LOGS.DETAILS_DIALOG.TITLE")}</DialogTitle>
          <DialogDescription>
            {formatTimestamp(log.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          {log.request_id && (
            <DetailRow
              label={t("LOGS.DETAIL.REQUEST_ID")}
              value={log.request_id}
              copyable
            />
          )}
          {log.model_name && (
            <DetailRow
              label={t("LOGS.TABLE.MODEL")}
              value={log.model_name}
              copyable
            />
          )}
          {log.token_name && (
            <DetailRow label={t("LOGS.TABLE.TOKEN")} value={log.token_name} />
          )}
          {log.channel != null && log.channel > 0 && (
            <DetailRow
              label={t("LOGS.DETAIL.CHANNEL")}
              value={`#${log.channel}${log.channel_name ? ` · ${log.channel_name}` : ""}`}
            />
          )}
          {log.username && (
            <DetailRow label={t("LOGS.TABLE.USER")} value={log.username} />
          )}
          {other?.request_path && (
            <DetailRow
              label={t("LOGS.DETAIL.REQUEST_PATH")}
              value={other.request_path}
              copyable
            />
          )}
          {client && (
            <DetailRow
              label={t("LOGS.DETAIL.CLIENT")}
              value={
                client.referer
                  ? `${client.label} · ${client.referer}`
                  : client.label
              }
              copyable
            />
          )}
          {client?.userAgent && (
            <DetailRow
              label={t("LOGS.DETAIL.USER_AGENT")}
              value={client.userAgent}
              copyable
            />
          )}

          <div className="border-border/40 flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs tracking-wider uppercase">
                {t("LOGS.DETAILS_DIALOG.PRICING")}
              </span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {tierLabel}
                {matchedTier ? ` · ${matchedTier}` : ""}
              </Badge>
            </div>
            {modelRatio > 0 ? (
              <>
                <PriceRow
                  label={t("LOGS.DETAILS_DIALOG.INPUT_PRICE")}
                  value={`${formatPriceCompact(inputPrice)} ${t("LOGS.PRICING.PER_M")}`}
                />
                <PriceRow
                  label={t("LOGS.DETAILS_DIALOG.OUTPUT_PRICE")}
                  value={`${formatPriceCompact(outputPrice)} ${t("LOGS.PRICING.PER_M")}`}
                />
                {cacheReadPrice != null && cacheReadPrice > 0 && (
                  <PriceRow
                    label={t("LOGS.DETAILS_DIALOG.CACHE_READ")}
                    value={`${formatPriceCompact(cacheReadPrice)} ${t("LOGS.PRICING.PER_M")}`}
                  />
                )}
                {cacheCreatePrice != null && cacheCreatePrice > 0 && (
                  <PriceRow
                    label={t("LOGS.DETAILS_DIALOG.CACHE_WRITE")}
                    value={`${formatPriceCompact(cacheCreatePrice)} ${t("LOGS.PRICING.PER_M")}`}
                  />
                )}
                {groupRatio != null && groupRatio > 0 && groupRatio !== 1 && (
                  <PriceRow
                    label={t("LOGS.DETAILS_DIALOG.GROUP_RATIO")}
                    value={`x${groupRatio}`}
                  />
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-xs">
                {t("LOGS.DETAILS_DIALOG.NO_PRICING")}
              </span>
            )}
          </div>

          <div className="border-border/40 flex flex-col gap-2 rounded-md border p-3">
            <span className="text-muted-foreground text-xs tracking-wider uppercase">
              {t("LOGS.DETAILS_DIALOG.USAGE")}
            </span>
            <PriceRow
              label={t("LOGS.TABLE.INPUT")}
              value={(log.prompt_tokens ?? 0).toLocaleString()}
            />
            <PriceRow
              label={t("LOGS.TABLE.OUTPUT")}
              value={(log.completion_tokens ?? 0).toLocaleString()}
            />
            {other?.cache_tokens != null && other.cache_tokens > 0 && (
              <PriceRow
                label={t("LOGS.CACHE_READ")}
                value={other.cache_tokens.toLocaleString()}
              />
            )}
            {other?.cache_creation_tokens != null &&
              other.cache_creation_tokens > 0 && (
                <PriceRow
                  label={t("LOGS.CACHE_WRITE")}
                  value={other.cache_creation_tokens.toLocaleString()}
                />
              )}
            <PriceRow
              label={t("LOGS.TABLE.SPEND")}
              value={renderQuota(log.quota, 6)}
            />
          </div>

          {log.content && (
            <div className="border-border/40 flex flex-col gap-1 rounded-md border p-3">
              <span className="text-muted-foreground text-xs tracking-wider uppercase">
                {t("LOGS.DETAIL.LOG_DETAILS")}
              </span>
              <p className="text-foreground text-xs wrap-break-word whitespace-pre-wrap">
                {log.content}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow(props: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const t = useTranslations();
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-xs">{props.label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="text-foreground truncate font-mono text-xs">
          {props.value}
        </span>
        {props.copyable && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => {
              copyToClipboard(props.value);
              toast.success(t("LOGS.COPIED"));
            }}
          >
            <Icon name="copy" className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function PriceRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{props.label}</span>
      <span className="text-foreground font-mono tabular-nums">
        {props.value}
      </span>
    </div>
  );
}
