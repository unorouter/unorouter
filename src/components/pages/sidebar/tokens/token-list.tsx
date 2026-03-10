"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/elements/table/data-table";
import {
  useDeleteTokenMutation,
  useFetchTokenKeyMutation,
  useToggleTokenStatusMutation,
  useTokensQuery,
} from "@/hooks/token-hook";
import type { PaginationState } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { LuKey, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";
import { toast } from "sonner";
import { type TokenRow, getTokenColumns } from "./token-columns";
import { CreateTokenSheet } from "./create-token-sheet";

export function TokenList() {
  const t = useTranslations();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Map<number, string>>(
    new Map(),
  );

  const tokensQuery = useTokensQuery({
    p: page + 1,
    keyword: keyword || undefined,
  });
  const toggleMutation = useToggleTokenStatusMutation();
  const deleteMutation = useDeleteTokenMutation();
  const fetchKeyMutation = useFetchTokenKeyMutation();

  const pageData = tokensQuery.data;
  const tokens = (pageData?.items ?? []).filter(
    (item): item is NonNullable<typeof item> => item != null,
  );
  const total = pageData?.total ?? 0;

  function handleSearch() {
    setKeyword(searchInput);
    setPage(0);
  }

  function handleToggleStatus(token: TokenRow) {
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

  function handleCopyKey(id: number) {
    const cached = revealedKeys.get(id);
    if (cached) {
      navigator.clipboard.writeText(`sk-${cached}`);
      toast.success(t("TOKEN.KEY_COPIED"));
      return;
    }
    fetchKeyMutation.mutate(id, {
      onSuccess: (data) => {
        navigator.clipboard.writeText(`sk-${data.key}`);
        toast.success(t("TOKEN.KEY_COPIED"));
        setRevealedKeys((prev) => new Map(prev).set(id, data.key));
      },
      onError: () => toast.error("Failed to fetch token key"),
    });
  }

  function toggleRevealKey(id: number) {
    if (revealedKeys.has(id)) {
      setRevealedKeys((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    fetchKeyMutation.mutate(id, {
      onSuccess: (data) => {
        setRevealedKeys((prev) => new Map(prev).set(id, data.key));
      },
      onError: () => toast.error("Failed to fetch token key"),
    });
  }

  function handlePaginationChange(pagination: PaginationState) {
    setPage(pagination.pageIndex);
    setPageSize(pagination.pageSize);
  }

  const columns = useMemo(
    () =>
      getTokenColumns({
        t,
        revealedKeys,
        toggleRevealKey,
        handleCopyKey,
        handleToggleStatus,
        setDeleteTarget,
        toggleMutationPending: toggleMutation.isPending,
      }),
    [t, revealedKeys, toggleMutation.isPending],
  );

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

      <DataTable
        data={tokens}
        columns={columns}
        total={total}
        pageIndex={page}
        pageSize={pageSize}
        onPaginationChange={handlePaginationChange}
        isLoading={tokensQuery.isLoading}
        columnVisibility
        filter={() => (
          <div className="flex items-center gap-2">
            <LuSearch className="text-muted-foreground h-4 w-4 shrink-0" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t("TOKEN.SEARCH_PLACEHOLDER")}
              className="h-8 w-48 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={handleSearch}
            >
              {t("TOKEN.SEARCH_PLACEHOLDER").split("...")[0]}
            </Button>
          </div>
        )}
        emptyState={
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
        }
      />

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
