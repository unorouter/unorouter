"use client";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  useCreateLorebookMutation,
  useDeleteLorebookMutation,
  useDuplicateLorebookMutation,
  useImportLorebookFromUrlMutation,
  useImportLorebookMutation,
  useLorebooksQuery,
} from "@/hooks/ai/rp/lorebooks";
import type { LorebookExportFormat } from "@/lib/validation/rp";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useState } from "react";
import { useRpExportMutation } from "@/hooks/ai/rp/use-export-mutation";
import {
  confirmRpDelete,
  RpAvatar,
  RpEntityRow,
  rpFilter,
  RpExportMenu,
  RP_ACTION_BUTTON,
  RpImportControl,
  RpListDialog,
} from "../shared/rp-list-parts";
import { useToggleFavoriteMutation } from "@/hooks/ai/rp/favorites";
import { LorebookEditor } from "./editor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LorebookList(props: Props) {
  const t = useTranslations();
  const lorebooksQuery = useLorebooksQuery();
  const [rpQuery, setRpQuery] = useState("");
  const createMut = useCreateLorebookMutation();
  const deleteMut = useDeleteLorebookMutation();
  const duplicateMut = useDuplicateLorebookMutation();
  const importMut = useImportLorebookMutation();
  const importUrlMut = useImportLorebookFromUrlMutation();
  const exportMut = useRpExportMutation();
  const favoriteMut = useToggleFavoriteMutation("lorebook");

  const [openLbId, setOpenLbId] = useState<string | null>(null);

  const handleCreate = async () => {
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
  };

  const handleExport = (id: string, format: LorebookExportFormat) =>
    exportMut.mutate({ kind: "lorebooks", id, format });

  return (
    <RpListDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="sm:max-w-2xl"
      titleKey="RP.LOREBOOKS_TITLE"
      title={
        openLbId
          ? lorebooksQuery.data?.find((l) => l.id === openLbId)?.name
          : undefined
      }
      onBack={openLbId ? () => setOpenLbId(null) : undefined}
      emptyKey="RP.LOREBOOKS_EMPTY"
      isEmpty={lorebooksQuery.data?.length === 0}
      editingId={openLbId}
      query={rpQuery}
      setQuery={setRpQuery}
      actions={
        <>
          <RpImportControl
            accept=".json,application/json"
            labelKey="RP.LOREBOOKS_IMPORT"
            isPending={importMut.isPending || importUrlMut.isPending}
            onFile={(file) => importMut.mutateAsync(file).then(() => {})}
            onUrl={(input) =>
              importUrlMut.mutateAsync(input).then((r) => {
                if (r?.importedAsPlugin) {
                  toast.success(
                    t("RP.LOREBOOKS_IMPORTED_AS_SCRIPT", {
                      name: r.importedAsPlugin,
                    }),
                  );
                }
                if (r?.importedAsPreset) {
                  toast.success(
                    t("RP.LOREBOOKS_IMPORTED_AS_PRESET", {
                      name: r.importedAsPreset,
                    }),
                  );
                }
              })
            }
            urlLabelKey="RP.LOREBOOKS_IMPORT_LINK"
            urlPlaceholderKey="RP.LOREBOOKS_IMPORT_LINK_PLACEHOLDER"
          />
          <Button
            onClick={handleCreate}
            disabled={createMut.isPending}
            className={RP_ACTION_BUTTON}
          >
            <Icon name="plus" className="size-4" />
            {t("RP.LOREBOOKS_NEW")}
          </Button>
        </>
      }
      editor={
        openLbId && (
          <LorebookEditor
            key={openLbId}
            lorebookId={openLbId}
            onDeleted={() => setOpenLbId(null)}
          />
        )
      }
    >
      {rpFilter(lorebooksQuery.data, rpQuery, (l) => [
        l.name,
        l.description,
      ]).map((l) => (
        <RpEntityRow
          createdAt={l.createdAt}
          updatedAt={l.updatedAt}
          key={l.id}
          favorite={{
            on: l.isFavorite,
            onToggle: () =>
              favoriteMut.mutate({ id: l.id, isFavorite: !l.isFavorite }),
          }}
          onOpen={() => setOpenLbId(l.id)}
          leading={<RpAvatar mediaId={l.avatarMediaId} name={l.name} />}
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
    </RpListDialog>
  );
}
