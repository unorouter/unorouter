"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useDeleteTokenMutation,
  useToggleTokenStatusMutation,
  useTokensQuery,
} from "@/hooks/token-hook";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuCopy,
  LuEye,
  LuEyeOff,
  LuKey,
  LuPlus,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";
import { renderQuota } from "@/lib/config/constants";
import { toast } from "sonner";
import { CreateTokenSheet } from "./create-token-sheet";
import dayjs from "dayjs";

function formatDate(timestamp: number): string {
  if (timestamp <= 0) return "";
  return dayjs.unix(timestamp).format("MMM D, YYYY");
}

function maskKey(key: string): string {
  if (key.length <= 8) return key;
  return key.slice(0, 3) + "****" + key.slice(-4);
}

function TokenRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-36" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
    </TableRow>
  );
}

export function TokenList() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());

  const tokensQuery = useTokensQuery({
    p: page,
    keyword: keyword || undefined,
  });
  const toggleMutation = useToggleTokenStatusMutation();
  const deleteMutation = useDeleteTokenMutation();

  const responseData = tokensQuery.data as
    | {
        data?: {
          items?: any[];
          total?: number;
          page?: number;
          page_size?: number;
        };
      }
    | { items?: any[]; total?: number; page?: number; page_size?: number }
    | undefined;

  const pageData =
    responseData && "data" in responseData && responseData.data
      ? responseData.data
      : (responseData as
          | { items?: any[]; total?: number; page?: number; page_size?: number }
          | undefined);

  const tokens = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const pageSize = pageData?.page_size ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSearch() {
    setKeyword(searchInput);
    setPage(1);
  }

  function handleToggleStatus(token: any) {
    const newStatus = token.status === 1 ? 2 : 1;
    toggleMutation.mutate(
      { id: token.id, status: newStatus },
      {
        onSuccess: () => toast.success(t("TOKEN.STATUS_CHANGED")),
        onError: () => toast.error("Failed to update status"),
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t("TOKEN.DELETED_SUCCESS"));
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete token"),
    });
  }

  function handleCopyKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success(t("TOKEN.KEY_COPIED"));
  }

  function toggleRevealKey(id: number) {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-0 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("TOKEN.TITLE")}
            </span>
          </div>
          <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
            {t("TOKEN.TITLE")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("TOKEN.DESCRIPTION")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <LuPlus data-icon="inline-start" className="h-4 w-4" />
          {t("TOKEN.CREATE")}
        </Button>
      </div>

      {/* Search */}
      <div className="border-border mb-4 flex items-center gap-2 border p-3">
        <LuSearch className="text-muted-foreground h-4 w-4 shrink-0" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={t("TOKEN.SEARCH_PLACEHOLDER")}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button variant="ghost" size="sm" onClick={handleSearch}>
          {t("TOKEN.SEARCH_PLACEHOLDER").split("...")[0]}
        </Button>
      </div>

      {/* Table */}
      <div className="border-border overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.COL_NAME")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.COL_STATUS")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.COL_QUOTA")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.COL_GROUP")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.COL_KEY")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.COL_MODELS")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.COL_CREATED")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.COL_EXPIRES")}
              </TableHead>
              <TableHead className="text-muted-foreground text-right font-mono text-[10px] tracking-widest uppercase">
                {t("TOKEN.COL_ACTIONS")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokensQuery.isLoading && (
              <>
                <TokenRowSkeleton />
                <TokenRowSkeleton />
                <TokenRowSkeleton />
              </>
            )}

            {!tokensQuery.isLoading && tokens.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <LuKey className="text-muted-foreground h-8 w-8" />
                    <span className="text-muted-foreground text-sm">
                      {t("TOKEN.NO_TOKENS")}
                    </span>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <LuPlus data-icon="inline-start" className="h-4 w-4" />
                      {t("TOKEN.CREATE")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {tokens.map((token: any) => {
              const isEnabled = token.status === 1;
              const isRevealed = revealedKeys.has(token.id);
              const modelCount =
                token.model_limits_enabled && token.model_limits
                  ? token.model_limits.split(",").filter(Boolean).length
                  : 0;

              return (
                <TableRow key={token.id}>
                  <TableCell>
                    <span className="text-foreground font-medium">
                      {token.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={isEnabled ? "default" : "secondary"}
                      className={
                        isEnabled ? "bg-green-500/10 text-green-500" : ""
                      }
                    >
                      {isEnabled
                        ? t("TOKEN.STATUS_ENABLED")
                        : t("TOKEN.STATUS_DISABLED")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm tabular-nums">
                      {token.unlimited_quota
                        ? t("TOKEN.UNLIMITED")
                        : `${renderQuota(token.used_quota)} / ${renderQuota(token.remain_quota)}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground font-mono text-xs">
                      {token.group || "\u2014"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                        {isRevealed ? token.key : maskKey(token.key)}
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
                                onClick={() => handleCopyKey(token.key)}
                              />
                            }
                          >
                            <LuCopy className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>{t("TOKEN.COPY_KEY")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-xs">
                      {token.model_limits_enabled && modelCount > 0
                        ? `${modelCount} models`
                        : t("TOKEN.ALL_MODELS")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground font-mono text-xs">
                      {formatDate(token.created_time)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground font-mono text-xs">
                      {token.expired_time === -1
                        ? t("TOKEN.NEVER_EXPIRES")
                        : formatDate(token.expired_time)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant={isEnabled ? "ghost" : "outline"}
                        size="xs"
                        onClick={() => handleToggleStatus(token)}
                        disabled={toggleMutation.isPending}
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-muted-foreground font-mono text-xs">
            {total} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <LuChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground px-2 font-mono text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <LuChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Sheet */}
      <CreateTokenSheet open={createOpen} onOpenChange={setCreateOpen} />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("TOKEN.DELETE_CONFIRM_TITLE")}</DialogTitle>
            <DialogDescription>
              {t("TOKEN.DELETE_CONFIRM_DESC")}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="bg-muted border-border rounded border p-3">
              <span className="font-mono text-sm">{deleteTarget.name}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("TOKEN.CANCEL")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <LuTrash2 data-icon="inline-start" className="h-4 w-4" />
              {t("TOKEN.DELETE")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
