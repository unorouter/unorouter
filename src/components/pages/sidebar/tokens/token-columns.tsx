"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { renderQuota } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/config/constants";
import type { ResponseDtoPageDataModelTokenDataItemsItem } from "@/openapi";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { LuCopy, LuEye, LuEyeOff, LuTrash2 } from "react-icons/lu";

export type TokenRow = NonNullable<ResponseDtoPageDataModelTokenDataItemsItem>;

function formatDate(timestamp: number): string {
  if (timestamp <= 0) return "";
  return dayjs.unix(timestamp).format("MMM D, YYYY");
}

export type TokenColumnActions = {
  t: (key: TranslationKey) => string;
  revealedKeys: Map<number, string>;
  toggleRevealKey: (id: number) => void;
  handleCopyKey: (id: number) => void;
  handleToggleStatus: (token: TokenRow) => void;
  setDeleteTarget: (target: { id: number; name: string }) => void;
  toggleMutationPending: boolean;
};

export function getTokenColumns(
  actions: TokenColumnActions,
): ColumnDef<TokenRow>[] {
  const {
    t,
    revealedKeys,
    toggleRevealKey,
    handleCopyKey,
    handleToggleStatus,
    setDeleteTarget,
    toggleMutationPending,
  } = actions;

  return [
    {
      accessorKey: "name",
      meta: { title: "TOKEN.COL_NAME" },
      header: t("TOKEN.COL_NAME"),
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-foreground font-medium">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "status",
      meta: { title: "TOKEN.COL_STATUS" },
      header: t("TOKEN.COL_STATUS"),
      enableSorting: false,
      cell: ({ row }) => {
        const isEnabled = row.original.status === 1;
        return (
          <Badge
            variant={isEnabled ? "default" : "secondary"}
            className={isEnabled ? "bg-green-500/10 text-green-500" : ""}
          >
            {isEnabled
              ? t("TOKEN.STATUS_ENABLED")
              : t("TOKEN.STATUS_DISABLED")}
          </Badge>
        );
      },
    },
    {
      id: "quota",
      meta: { title: "TOKEN.COL_QUOTA" },
      header: t("TOKEN.COL_QUOTA"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          {row.original.unlimited_quota
            ? t("TOKEN.UNLIMITED")
            : `${renderQuota(row.original.used_quota)} / ${renderQuota(row.original.remain_quota)}`}
        </span>
      ),
    },
    {
      accessorKey: "group",
      meta: { title: "TOKEN.COL_GROUP" },
      header: t("TOKEN.COL_GROUP"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.group || "\u2014"}
        </span>
      ),
    },
    {
      accessorKey: "key",
      meta: { title: "TOKEN.COL_KEY" },
      header: t("TOKEN.COL_KEY"),
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const token = row.original;
        const isRevealed = revealedKeys.has(token.id);
        const displayKey = isRevealed
          ? `sk-${revealedKeys.get(token.id)}`
          : `sk-${token.key}`;

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
                      onClick={() => toggleRevealKey(token.id)}
                    />
                  }
                >
                  {isRevealed ? (
                    <LuEyeOff className="h-3 w-3" />
                  ) : (
                    <LuEye className="h-3 w-3" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {isRevealed ? "Hide" : "Reveal"}
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
                      onClick={() => handleCopyKey(token.id)}
                    />
                  }
                >
                  <LuCopy className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{t("TOKEN.COPY_KEY")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
    {
      id: "models",
      meta: { title: "TOKEN.COL_MODELS" },
      header: t("TOKEN.COL_MODELS"),
      enableSorting: false,
      cell: ({ row }) => {
        const token = row.original;
        const modelCount =
          token.model_limits_enabled && token.model_limits
            ? token.model_limits.split(",").filter(Boolean).length
            : 0;
        return (
          <span className="text-muted-foreground text-xs">
            {token.model_limits_enabled && modelCount > 0
              ? `${modelCount} models`
              : t("TOKEN.ALL_MODELS")}
          </span>
        );
      },
    },
    {
      accessorKey: "created_time",
      meta: { title: "TOKEN.COL_CREATED" },
      header: t("TOKEN.COL_CREATED"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(row.original.created_time)}
        </span>
      ),
    },
    {
      accessorKey: "expired_time",
      meta: { title: "TOKEN.COL_EXPIRES" },
      header: t("TOKEN.COL_EXPIRES"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.expired_time === -1
            ? t("TOKEN.NEVER_EXPIRES")
            : formatDate(row.original.expired_time)}
        </span>
      ),
    },
    {
      id: "actions",
      meta: { title: "TOKEN.COL_ACTIONS", headerClassName: "text-right" },
      header: t("TOKEN.COL_ACTIONS"),
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const token = row.original;
        const isEnabled = token.status === 1;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant={isEnabled ? "ghost" : "outline"}
              size="xs"
              onClick={() => handleToggleStatus(token)}
              disabled={toggleMutationPending}
            >
              {isEnabled ? t("TOKEN.DISABLE") : t("TOKEN.ENABLE")}
            </Button>
            <Button
              variant="destructive"
              size="icon-xs"
              onClick={() =>
                setDeleteTarget({ id: token.id, name: token.name })
              }
            >
              <LuTrash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
  ];
}
