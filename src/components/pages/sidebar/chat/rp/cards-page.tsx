"use client";

import { RpLoginGate } from "@/components/pages/sidebar/chat/rp/rp-login-gate";
import { SyncBadge } from "@/components/elements/sync-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useApplyCardMutation,
  useCardsQuery,
  useDeleteCardMutation,
} from "@/hooks/rp-hook";
import { useAuiState } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LuArrowLeft,
  LuDownload,
  LuPlay,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { toast } from "sonner";
import { CardForm } from "./card-form";

export function CardsPage() {
  const t = useTranslations();
  const isLoggedIn = !!useAuthQuery().data;
  const cardsQuery = useCardsQuery();
  const deleteMut = useDeleteCardMutation();
  const applyMut = useApplyCardMutation();
  const activeConvId = useAuiState((s) => s.threadListItem?.remoteId);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [applyTarget, setApplyTarget] = useState<{
    cardId: string;
    cardName: string;
  } | null>(null);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <RpLoginGate />
      </div>
    );
  }

  const handleExport = async (id: string) => {
    const res = await fetch(`/api/rp/cards/${id}/export`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fname =
      res.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? `card-${id}.json`;
    link.href = url;
    link.download = fname;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync(id);
    if (editingId === id) setEditingId(null);
  };

  const doApply = async (mode: "replace" | "merge") => {
    if (!applyTarget) return;
    if (!activeConvId) {
      toast.error(t("RP.CARDS_NO_CONV"));
      setApplyTarget(null);
      return;
    }
    await applyMut.mutateAsync({
      id: applyTarget.cardId,
      body: { convId: activeConvId, mode },
    });
    toast.success(t("RP.CARDS_APPLIED"));
    setApplyTarget(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">
            {t("RP.CARDS_TITLE")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("RP.CARDS_PAGE_SUBTITLE")}
          </p>
        </div>
        {!editingId && (
          <Button onClick={() => setEditingId("new")}>
            <LuPlus className="mr-2 size-4" />
            {t("RP.CARDS_NEW")}
          </Button>
        )}
        {editingId && (
          <Button variant="ghost" onClick={() => setEditingId(null)}>
            <LuArrowLeft className="mr-2 size-4" />
            {t("RP.CARDS_BACK")}
          </Button>
        )}
      </div>

      {editingId ? (
        <Card className="p-4">
          <CardForm
            editingId={editingId}
            onDone={() => setEditingId(null)}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {cardsQuery.data?.length === 0 && (
            <Card className="text-muted-foreground py-10 text-center text-sm">
              {t("RP.CARDS_EMPTY")}
            </Card>
          )}
          {cardsQuery.data?.map((c) => (
            <Card
              key={c.id}
              className="hover:bg-accent flex cursor-pointer flex-row items-center gap-3 p-3 transition-colors"
              onClick={() => setEditingId(c.id)}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">{c.name}</span>
                {c.description && (
                  <span className="text-muted-foreground truncate text-xs">
                    {c.description}
                  </span>
                )}
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <SyncBadge kind="cards" id={c.id} compact />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("RP.CARDS_APPLY")}
                onClick={(e) => {
                  e.stopPropagation();
                  setApplyTarget({ cardId: c.id, cardName: c.name });
                }}
              >
                <LuPlay className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("RP.CARDS_EXPORT")}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleExport(c.id);
                }}
              >
                <LuDownload className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(c.id);
                }}
              >
                <LuTrash2 className="size-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!applyTarget}
        onOpenChange={(o) => !o && setApplyTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("RP.CARDS_APPLY_TITLE")}</DialogTitle>
            <DialogDescription>
              {t("RP.CARDS_APPLY_DESC", { name: applyTarget?.cardName ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setApplyTarget(null)}>
              {t("COMMON.CANCEL")}
            </Button>
            <Button variant="outline" onClick={() => void doApply("merge")}>
              {t("RP.CARDS_APPLY_MERGE")}
            </Button>
            <Button onClick={() => void doApply("replace")}>
              {t("RP.CARDS_APPLY_REPLACE")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
