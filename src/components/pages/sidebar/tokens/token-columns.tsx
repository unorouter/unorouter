"use client";

import {
  DataTableRowActions,
  type RowAction,
} from "@/components/elements/table/data-table-row-actions";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useDeleteTokenMutation,
  useFetchTokenKeyMutation,
  useToggleTokenStatusMutation,
} from "@/hooks/billing/token-hook";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { renderQuota } from "@/lib/config/constants";
import { copyToClipboard, copyToClipboardAsync } from "@/lib/utils/base";
import type { Token } from "@/openapi";
import type { CellContext } from "@tanstack/react-table";
import { formatLongDate } from "@/lib/utils/format/date";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { editingTokenAtom } from "./token-list";

export type TokenRow = NonNullable<Token>;

const MODEL_PREVIEW_CAP = 12;

export function TokenStatusCell(props: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  const isEnabled = props.row.original.status === 1;
  return (
    <Badge
      variant={isEnabled ? "default" : "destructive"}
      className={isEnabled ? "bg-green-500/10 text-green-500" : ""}
    >
      {isEnabled ? t("TOKEN.ENUM.ENABLED") : t("TOKEN.ENUM.DISABLED")}
    </Badge>
  );
}

export function TokenQuotaCell(props: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  return (
    <span className="font-mono text-sm tabular-nums">
      {props.row.original.unlimited_quota
        ? t("TOKEN.UNLIMITED")
        : `${renderQuota(props.row.original.used_quota)} / ${renderQuota(props.row.original.remain_quota)}`}
    </span>
  );
}

export function TokenKeyCell(props: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  const fetchKeyMutation = useFetchTokenKeyMutation();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const token = props.row.original;
  const displayKey = revealedKey ? `sk-${revealedKey}` : `sk-${token.key}`;

  function handleCopy() {
    if (revealedKey) {
      copyToClipboard(`sk-${revealedKey}`);
      toast.success(t("TOKEN.SUCCESS.KEY_COPIED"));
      return;
    }
    copyToClipboardAsync(() =>
      fetchKeyMutation
        .mutateAsync({ id: token.id })
        .then((data) => `sk-${data.key}`),
    )
      .then(() => toast.success(t("TOKEN.SUCCESS.KEY_COPIED")))
      .catch(() => toast.error(t("TOKEN.ERROR.FETCH_KEY")));
  }

  function handleToggleReveal() {
    if (revealedKey) {
      setRevealedKey(null);
      return;
    }
    fetchKeyMutation.mutate(
      { id: token.id },
      {
        onSuccess: (data) => setRevealedKey(data.key),
        onError: () => toast.error(t("TOKEN.ERROR.FETCH_KEY")),
      },
    );
  }

  return (
    <div className="flex items-center gap-1">
      <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
        {displayKey}
      </code>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleToggleReveal}
                aria-label={
                  revealedKey
                    ? t("TOKEN.KEY_DISPLAY.HIDE")
                    : t("TOKEN.KEY_DISPLAY.REVEAL")
                }
              />
            }
          >
            {revealedKey ? (
              <Icon name="eye-off" className="h-3 w-3" />
            ) : (
              <Icon name="eye" className="h-3 w-3" />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {revealedKey
              ? t("TOKEN.KEY_DISPLAY.HIDE")
              : t("TOKEN.KEY_DISPLAY.REVEAL")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCopy}
                aria-label={t("TOKEN.COPY_KEY")}
              />
            }
          >
            <Icon name="copy" className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent>{t("TOKEN.COPY_KEY")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function TokenModelsCell(props: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  const token = props.row.original;
  const pricingQuery = usePricingQuery();
  const models = pricingQuery.data?.models ?? [];

  if (!token.model_limits_enabled || !token.model_limits) {
    return (
      <span className="text-muted-foreground text-xs">
        {t("TOKEN.ALL_MODELS")}
      </span>
    );
  }

  const modelNames = token.model_limits.split(",").filter(Boolean);
  if (modelNames.length === 0) {
    return (
      <span className="text-muted-foreground text-xs">
        {t("TOKEN.ALL_MODELS")}
      </span>
    );
  }

  const vendorModels = new Map<string, string[]>();
  for (const name of modelNames) {
    const found = models.find((m) => m.name === name);
    const vendor = found?.vendor.name ?? "unknown";
    const list = vendorModels.get(vendor);
    if (list) list.push(name);
    else vendorModels.set(vendor, [name]);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="flex items-center gap-1">
          {[...vendorModels.keys()].map((vendor) => (
            <VendorIcon key={vendor} vendor={vendor} size={16} />
          ))}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <ul className="space-y-0.5 text-xs">
            {modelNames.slice(0, MODEL_PREVIEW_CAP).map((name) => (
              <li key={name} className="font-mono">
                {name}
              </li>
            ))}
          </ul>
          {modelNames.length > MODEL_PREVIEW_CAP && (
            <p className="text-muted-foreground mt-1 text-xs">
              {t("TOKEN.MODELS_MORE", {
                count: modelNames.length - MODEL_PREVIEW_CAP,
              })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TokenActionCell(props: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  const setEditingToken = useSetAtom(editingTokenAtom);
  const toggleMutation = useToggleTokenStatusMutation();
  const deleteMutation = useDeleteTokenMutation();
  const token = props.row.original;
  const isEnabled = token.status === 1;

  const actions: RowAction[] = [
    {
      value: "edit",
      label: "TOKEN.EDIT",
      icon: (
        <Icon
          name="pencil"
          className="text-muted-foreground/70 mr-2 h-3.5 w-3.5"
        />
      ),
      onClick: () => setEditingToken(token),
    },
    {
      value: "toggle",
      label: isEnabled ? "TOKEN.DISABLE" : "TOKEN.ENABLE",
      icon: isEnabled ? (
        <Icon
          name="power-off"
          className="text-muted-foreground/70 mr-2 h-3.5 w-3.5"
        />
      ) : (
        <Icon
          name="power"
          className="text-muted-foreground/70 mr-2 h-3.5 w-3.5"
        />
      ),
      disabled: toggleMutation.isPending,
      onClick: () =>
        toggleMutation.mutate(
          { body: { ...token, status: isEnabled ? 2 : 1 } },
          {
            onSuccess: () => toast.success(t("TOKEN.SUCCESS.STATUS_CHANGED")),
            onError: () => toast.error(t("TOKEN.ERROR.STATUS_UPDATE")),
          },
        ),
    },
    {
      value: "delete",
      label: "TOKEN.DELETE.BUTTON",
      icon: <Icon name="trash-2" className="mr-2 h-3.5 w-3.5" />,
      variant: "destructive",
      separator: true,
      disabled: deleteMutation.isPending,
      onClick: () =>
        deleteMutation.mutate(
          { id: token.id },
          {
            onSuccess: () => toast.success(t("TOKEN.SUCCESS.DELETED")),
            onError: () => toast.error(t("TOKEN.ERROR.DELETE")),
          },
        ),
    },
  ];

  return <DataTableRowActions row={props.row} actions={actions} />;
}

export function TokenDateCell(props: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  const value =
    props.row.original[props.column.id as "created_time" | "expired_time"];
  return (
    <span className="text-muted-foreground font-mono text-xs">
      {value === -1 ? t("TOKEN.FORM.NEVER_EXPIRES") : formatLongDate(value)}
    </span>
  );
}

export function TokenEmptyState(props: { onCreate: () => void }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-3">
      <Icon name="key" className="text-muted-foreground h-8 w-8" />
      <span className="text-muted-foreground text-sm">
        {t("TOKEN.NO_TOKENS")}
      </span>
      <Button size="sm" onClick={props.onCreate}>
        <Icon name="plus" data-icon="inline-start" className="h-4 w-4" />
        {t("TOKEN.CREATE")}
      </Button>
    </div>
  );
}
