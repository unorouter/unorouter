"use client";

import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { SyncBadge } from "@/components/elements/badge/sync-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateLorebookMutation,
  useDeleteLorebookMutation,
  useImportLorebookMutation,
  useLorebooksQuery,
} from "@/hooks/ai/rp/lorebooks";
import { analytics } from "@/lib/analytics";
import { rpc } from "@/lib/rpc";
import type { LorebookExportFormat } from "@/lib/validation/rp";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { downloadFileResponse } from "@/lib/utils/client";
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
  const importMut = useImportLorebookMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openLbId, setOpenLbId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset selection when dialog closes
    if (!props.open) setOpenLbId(null);
  }, [props.open]);

  const handleCreate = async () => {
    analytics.rp.entityAction({
      entity: "lorebook",
      action: "create_started",
    });
    await createMut.mutateAsync({
      body: { name: t("RP.LOREBOOK_UNTITLED") },
    });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.DELETE_LOREBOOK_TITLE"),
      description: t("COMMON.CONFIRM.DELETE_LOREBOOK_DESC"),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({ entity: "lorebook", action: "deleted" });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      await importMut.mutateAsync(file);
      analytics.rp.entityAction({ entity: "lorebook", action: "imported" });
    } catch {
      analytics.rp.entityAction({
        entity: "lorebook",
        action: "import_failed",
      });
    }
  };

  const handleExport = async (id: string, format: LorebookExportFormat) => {
    const ok = await downloadFileResponse(
      rpc.api.ai.rp.lorebooks({ id }).export.get({ query: { format } }),
      `lorebook-${id}.${format}.json`,
    );
    if (ok) {
      analytics.rp.entityAction({
        entity: "lorebook",
        action: "exported",
        format,
      });
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
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

        {openLbId ? (
          <LorebookEditor
            lorebookId={openLbId}
            onDeleted={() => setOpenLbId(null)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => {
                  analytics.rp.entityAction({
                    entity: "lorebook",
                    action: "import_picker_opened",
                  });
                  fileInputRef.current?.click();
                }}
                disabled={importMut.isPending}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <Icon name="upload" className="size-4" />
                <span className="truncate">{t("RP.LOREBOOKS_IMPORT")}</span>
              </Button>
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
              <Card className="text-muted-foreground py-10 text-center text-sm">
                {t("RP.LOREBOOKS_EMPTY")}
              </Card>
            )}

            <div className="flex flex-col gap-2">
              {lorebooksQuery.data?.map((l) => (
                <Card
                  key={l.id}
                  className="hover:bg-accent flex cursor-pointer flex-row items-center gap-3 p-3 transition-colors"
                  onClick={() => {
                    analytics.rp.entityAction({
                      entity: "lorebook",
                      action: "edit_started",
                    });
                    setOpenLbId(l.id);
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{l.name}</span>
                    {l.description && (
                      <span className="text-muted-foreground truncate text-xs">
                        {l.description}
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <SyncBadge kind="lorebooks" id={l.id} payload={l} compact />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("RP.LOREBOOKS_EXPORT")}
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <Icon name="download" className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onClick={() => handleExport(l.id, "sillytavern")}
                      >
                        {t("RP.EXPORT_SILLYTAVERN")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(l.id, "agnai")}
                      >
                        {t("RP.EXPORT_AGNAI")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(l.id, "risu")}
                      >
                        {t("RP.EXPORT_RISU")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport(l.id, "ccv3")}
                      >
                        {t("RP.EXPORT_CCV3")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(l.id);
                    }}
                  >
                    <Icon name="trash-2" className="size-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
