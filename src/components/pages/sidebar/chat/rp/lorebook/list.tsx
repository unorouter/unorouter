"use client";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateLorebookMutation,
  useDeleteLorebookMutation,
  useDuplicateLorebookMutation,
  useImportLorebookMutation,
  useLorebooksQuery,
} from "@/hooks/ai/rp/lorebooks";
import { analytics } from "@/lib/analytics";
import type { LorebookExportFormat } from "@/lib/validation/rp";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRpExportMutation } from "@/hooks/ai/rp/use-export-mutation";
import {
  confirmRpDelete,
  RpEmptyCard,
  RpEntityRow,
  RpExportMenu,
  RpImportControl,
} from "../shared/rp-list-parts";
import { LorebookEditor } from "./editor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LorebookList(props: Props) {
  const t = useTranslations();
  const lorebooksQuery = useLorebooksQuery();
  const createMut = useCreateLorebookMutation();
  const deleteMut = useDeleteLorebookMutation();
  const duplicateMut = useDuplicateLorebookMutation();
  const importMut = useImportLorebookMutation();
  const exportMut = useRpExportMutation();

  const [openLbId, setOpenLbId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset selection when dialog closes
    if (!props.open) setOpenLbId(null);
  }, [props.open]);

  const handleCreate = async () => {
    analytics.rp.entityAction({
      entity: "lorebooks",
      action: "create_started",
    });
    await createMut.mutateAsync({
      body: { name: t("RP.LOREBOOK_UNTITLED") },
    });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmRpDelete(
      t,
      "COMMON.CONFIRM.DELETE_LOREBOOK_TITLE",
      "COMMON.CONFIRM.DELETE_LOREBOOK_DESC",
    );
    if (!ok) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({ entity: "lorebooks", action: "deleted" });
  };

  const handleExport = (id: string, format: LorebookExportFormat) =>
    exportMut.mutate({ kind: "lorebooks", id, format });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {openLbId && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpenLbId(null)}
              >
                <Icon name="arrow-left" className="size-4" />
              </Button>
            )}
            {openLbId
              ? (lorebooksQuery.data?.find((l) => l.id === openLbId)?.name ??
                t("RP.LOREBOOKS_TITLE"))
              : t("RP.LOREBOOKS_TITLE")}
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-6 min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6">
          {openLbId ? (
            <LorebookEditor
              key={openLbId}
              lorebookId={openLbId}
              onDeleted={() => setOpenLbId(null)}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-end gap-2 pr-12">
                <RpImportControl
                  entity="lorebooks"
                  accept="application/json"
                  labelKey="RP.LOREBOOKS_IMPORT"
                  isPending={importMut.isPending}
                  onFile={(file) => importMut.mutateAsync(file).then(() => {})}
                />
                <Button
                  onClick={handleCreate}
                  disabled={createMut.isPending}
                  className="min-w-0 flex-1 sm:flex-initial"
                >
                  <Icon name="plus" className="size-4" />
                  <span className="truncate">{t("RP.LOREBOOKS_NEW")}</span>
                </Button>
              </div>

              {lorebooksQuery.data?.length === 0 && (
                <RpEmptyCard labelKey="RP.LOREBOOKS_EMPTY" />
              )}

              <div className="flex flex-col gap-2">
                {lorebooksQuery.data?.map((l) => (
                  <RpEntityRow
                    key={l.id}
                    onOpen={() => {
                      analytics.rp.entityAction({
                        entity: "lorebooks",
                        action: "edit_started",
                      });
                      setOpenLbId(l.id);
                    }}
                    name={l.name}
                    description={l.description}
                    actions={
                      <RpExportMenu
                        ariaLabel={t("RP.LOREBOOKS_EXPORT")}
                        items={[
                          {
                            label: t("RP.EXPORT_SILLYTAVERN"),
                            onClick: () => handleExport(l.id, "sillytavern"),
                          },
                          {
                            label: t("RP.EXPORT_AGNAI"),
                            onClick: () => handleExport(l.id, "agnai"),
                          },
                          {
                            label: t("RP.EXPORT_RISU"),
                            onClick: () => handleExport(l.id, "risu"),
                          },
                          {
                            label: t("RP.EXPORT_CCV3"),
                            onClick: () => handleExport(l.id, "ccv3"),
                          },
                        ]}
                      />
                    }
                    onDuplicate={() => duplicateMut.mutate(l.id)}
                    onDelete={() => handleDelete(l.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
