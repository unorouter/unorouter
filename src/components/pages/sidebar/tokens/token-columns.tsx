"use client";

import {
  DataTableRowActions,
  type RowAction,
} from "@/components/elements/table/data-table-row-actions";
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
} from "@/hooks/token-hook";
import { renderQuota } from "@/lib/config/constants";
import { copyToClipboard, copyToClipboardAsync } from "@/lib/utils/base";
import type { ResponseDtoPageDataModelTokenDataItemsItem } from "@/openapi";
import type { CellContext } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LuCopy,
  LuEye,
  LuEyeOff,
  LuKey,
  LuPencil,
  LuPlus,
  LuPower,
  LuPowerOff,
  LuTrash2,
} from "react-icons/lu";
import { toast } from "sonner";
import { editingTokenAtom } from "./token-list";

export type TokenRow = NonNullable<ResponseDtoPageDataModelTokenDataItemsItem>;

function formatDate(timestamp: number): string {
  if (timestamp <= 0) return "";
  return dayjs.unix(timestamp).format("MMM D, YYYY");
}

export function TokenStatusCell({ row }: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  const isEnabled = row.original.status === 1;
  return (
    <Badge
      variant={isEnabled ? "default" : "destructive"}
      className={isEnabled ? "bg-green-500/10 text-green-500" : ""}
    >
      {isEnabled ? t("TOKEN.STATUS_ENABLED") : t("TOKEN.STATUS_DISABLED")}
    </Badge>
  );
}

export function TokenQuotaCell({ row }: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  return (
    <span className="font-mono text-sm tabular-nums">
      {row.original.unlimited_quota
        ? t("TOKEN.UNLIMITED")
        : `${renderQuota(row.original.used_quota)} / ${renderQuota(row.original.remain_quota)}`}
    </span>
  );
}

export function TokenKeyCell({ row }: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  const fetchKeyMutation = useFetchTokenKeyMutation();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const token = row.original;
  const displayKey = revealedKey ? `sk-${revealedKey}` : `sk-${token.key}`;

  function handleCopy() {
    if (revealedKey) {
      copyToClipboard(`sk-${revealedKey}`);
      toast.success(t("TOKEN.KEY_COPIED"));
      return;
    }
    copyToClipboardAsync(() =>
      fetchKeyMutation.mutateAsync(token.id).then((data) => `sk-${data.key}`),
    )
      .then(() => toast.success(t("TOKEN.KEY_COPIED")))
      .catch(() => toast.error(t("TOKEN.FETCH_KEY_FAILED")));
  }

  function handleToggleReveal() {
    if (revealedKey) {
      setRevealedKey(null);
      return;
    }
    fetchKeyMutation.mutate(token.id, {
      onSuccess: (data) => setRevealedKey(data.key),
      onError: () => toast.error(t("TOKEN.FETCH_KEY_FAILED")),
    });
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
              />
            }
          >
            {revealedKey ? (
              <LuEyeOff className="h-3 w-3" />
            ) : (
              <LuEye className="h-3 w-3" />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {revealedKey ? t("TOKEN.HIDE_KEY") : t("TOKEN.REVEAL_KEY")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-xs" onClick={handleCopy} />
            }
          >
            <LuCopy className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent>{t("TOKEN.COPY_KEY")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function TokenModelsCell({ row }: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  const token = row.original;
  const modelCount =
    token.model_limits_enabled && token.model_limits
      ? token.model_limits.split(",").filter(Boolean).length
      : 0;
  return (
    <span className="text-muted-foreground text-xs">
      {token.model_limits_enabled && modelCount > 0
        ? t("TOKEN.MODEL_COUNT", { count: modelCount })
        : t("TOKEN.ALL_MODELS")}
    </span>
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
      icon: <LuPencil className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />,
      onClick: () => setEditingToken(token),
    },
    {
      value: "toggle",
      label: isEnabled ? "TOKEN.DISABLE" : "TOKEN.ENABLE",
      icon: isEnabled ? (
        <LuPowerOff className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
      ) : (
        <LuPower className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
      ),
      disabled: toggleMutation.isPending,
      onClick: () =>
        toggleMutation.mutate(
          { ...token, status: isEnabled ? 2 : 1 },
          {
            onSuccess: () => toast.success(t("TOKEN.STATUS_CHANGED")),
            onError: () => toast.error(t("TOKEN.STATUS_UPDATE_FAILED")),
          },
        ),
    },
    {
      value: "delete",
      label: "TOKEN.DELETE",
      icon: <LuTrash2 className="mr-2 h-3.5 w-3.5" />,
      variant: "destructive",
      separator: true,
      disabled: deleteMutation.isPending,
      onClick: () =>
        deleteMutation.mutate(token.id, {
          onSuccess: () => toast.success(t("TOKEN.DELETED_SUCCESS")),
          onError: () => toast.error(t("TOKEN.DELETE_FAILED")),
        }),
    },
  ];

  return <DataTableRowActions row={props.row} actions={actions} />;
}

export function TokenDateCell({ row, column }: CellContext<TokenRow, unknown>) {
  const t = useTranslations();
  const value = row.original[column.id as "created_time" | "expired_time"];
  return (
    <span className="text-muted-foreground font-mono text-xs">
      {value === -1 ? t("TOKEN.NEVER_EXPIRES") : formatDate(value)}
    </span>
  );
}

export function TokenEmptyState(props: { onCreate: () => void }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-3">
      <LuKey className="text-muted-foreground h-8 w-8" />
      <span className="text-muted-foreground text-sm">
        {t("TOKEN.NO_TOKENS")}
      </span>
      <Button size="sm" onClick={props.onCreate}>
        <LuPlus data-icon="inline-start" className="h-4 w-4" />
        {t("TOKEN.CREATE")}
      </Button>
    </div>
  );
}
