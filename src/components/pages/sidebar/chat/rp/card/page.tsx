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
import { Icon } from "@/components/ui/icon";
import {
  useApplyCardMutation,
  useCardsQuery,
  useDeleteCardMutation,
  useImportCardFromFileMutation,
} from "@/hooks/ai/rp/cards";
import { useRpExportMutation } from "@/hooks/ai/rp/use-export-mutation";
import { useAuiState } from "@assistant-ui/react";
import type { EntityEditId } from "@/lib/types";
import type { CardApplyMode } from "@/lib/validation/rp";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { RpEntityPage } from "../shared/rp-entity-page";
import {
  confirmRpDelete,
  RpEmptyCard,
  RpEntityRow,
  rpFilter,
  RpImportControl,
} from "../shared/rp-list-parts";
import { CardForm } from "./form";

function useCardSummary() {
  const t = useTranslations();
  return (card: {
    personaName: string | null;
    characterNames: string[];
    lorebookNames: string[];
  }) => {
    const parts: string[] = [];
    if (card.personaName) parts.push(card.personaName);
    if (card.characterNames.length > 0) {
      parts.push(
        card.characterNames.length > 3
          ? t("RP.CARDS_SUMMARY_CHARACTERS", {
              count: card.characterNames.length,
            })
          : card.characterNames.join(", "),
      );
    }
    if (card.lorebookNames.length > 0) {
      parts.push(
        t("RP.CARDS_SUMMARY_LOREBOOKS", { count: card.lorebookNames.length }),
      );
    }
    return parts.join(", ");
  };
}

export function CardsPage() {
  const t = useTranslations();
  const cardSummary = useCardSummary();
  const cardsQuery = useCardsQuery();
  const [rpQuery, setRpQuery] = useState("");
  const deleteMut = useDeleteCardMutation();
  const applyMut = useApplyCardMutation();
  const exportMut = useRpExportMutation();
  const importMut = useImportCardFromFileMutation();
  const activeConvId = useAuiState((s) => s.threadListItem?.remoteId);
  const [editingId, setEditingId] = useState<EntityEditId>(null);
  const [applyTarget, setApplyTarget] = useState<{
    cardId: string;
    cardName: string;
  } | null>(null);

  const handleExport = (id: string) => exportMut.mutate({ kind: "cards", id });

  const handleDelete = async (id: string) => {
    const ok = await confirmRpDelete(
      t,
      "COMMON.CONFIRM.DELETE_CARD_TITLE",
      "COMMON.CONFIRM.DELETE_CARD_DESC",
    );
    if (!ok) return;
    await deleteMut.mutateAsync(id);
    if (editingId === id) setEditingId(null);
  };

  const doApply = async (mode: CardApplyMode) => {
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
        search={rpQuery}
        onSearchChange={setRpQuery}
        titleKey="RP.CARDS_TITLE"
        subtitleKey="RP.CARDS_PAGE_SUBTITLE"
        newLabelKey="RP.CARDS_NEW"
        backLabelKey="RP.CARDS_BACK"
        isEditing={editingId !== null}
        onNew={() => setEditingId("new")}
        onBack={() => setEditingId(null)}
        headerActions={
          <RpImportControl
            entity="cards"
            accept="application/json"
            labelKey="RP.CARDS_IMPORT"
            isPending={importMut.isPending}
            onFile={(file) => importMut.mutateAsync(file).then(() => {})}
          />
        }
        editor={
          editingId && (
            <CardForm
              key={editingId}
              editingId={editingId}
              onDone={() => setEditingId(null)}
            />
          )
        }
        list={
          // The ROWS scroll, not the page: an import can bring many items at
          // once, and scrolling everything pushes the controls away.
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {cardsQuery.data?.length === 0 && (
              <RpEmptyCard labelKey="RP.CARDS_EMPTY" />
            )}
            {rpFilter(cardsQuery.data, rpQuery, (c) => [
              c.name,
              c.description,
            ]).map((c) => (
              <RpEntityRow
                createdAt={c.createdAt}
                updatedAt={c.updatedAt}
                key={c.id}
                onOpen={() => setEditingId(c.id)}
                name={c.name}
                description={cardSummary(c) || c.description}
                actions={
                  <>
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
                  </>
                }
                onDelete={() => handleDelete(c.id)}
              />
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
