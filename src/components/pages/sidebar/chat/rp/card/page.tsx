"use client";

import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { SyncBadge } from "@/components/elements/badge/sync-badge";
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
import { rpc } from "@/lib/rpc";
import {
  useApplyCardMutation,
  useCardsQuery,
  useDeleteCardMutation,
} from "@/hooks/ai/rp/cards";
import { useAuiState } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { CardForm } from "./form";
import { exportRpEntity } from "../shared/export-entity";
import { RpEntityPage } from "../shared/rp-entity-page";

export function CardsPage() {
  const t = useTranslations();
  const cardsQuery = useCardsQuery();
  const deleteMut = useDeleteCardMutation();
  const applyMut = useApplyCardMutation();
  const activeConvId = useAuiState((s) => s.threadListItem?.remoteId);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [applyTarget, setApplyTarget] = useState<{
    cardId: string;
    cardName: string;
  } | null>(null);

  const handleExport = (id: string) =>
    exportRpEntity(rpc.api.ai.rp.cards({ id }).export.get(), `card-${id}.json`);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.DELETE_CARD_TITLE"),
      description: t("COMMON.CONFIRM.DELETE_CARD_DESC"),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
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
    <>
      <RpEntityPage
        titleKey="RP.CARDS_TITLE"
        subtitleKey="RP.CARDS_PAGE_SUBTITLE"
        newLabelKey="RP.CARDS_NEW"
        backLabelKey="RP.CARDS_BACK"
        isEditing={editingId !== null}
        onNew={() => setEditingId("new")}
        onBack={() => setEditingId(null)}
        editor={
          editingId && (
            <CardForm
              editingId={editingId}
              onDone={() => setEditingId(null)}
            />
          )
        }
        list={
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
                  <Icon name="play" className="size-4" />
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
                  <Icon name="download" className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(c.id);
                  }}
                >
                  <Icon name="trash-2" className="size-4" />
                </Button>
              </Card>
            ))}
          </div>
        }
      />

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
    </>
  );
}
