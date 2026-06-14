"use client";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  useDeletePresetMutation,
  usePresetsQuery,
} from "@/hooks/ai/rp/presets";
import { analytics } from "@/lib/analytics";
import type { EntityEditId } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PresetForm } from "./form";
import { useRpExportMutation } from "@/hooks/ai/rp/use-export-mutation";
import { RpEntityPage } from "../shared/rp-entity-page";
import {
  confirmRpDelete,
  RpEmptyCard,
  RpEntityRow,
} from "../shared/rp-list-parts";

    // Dedicated /chat/presets page (replaced the Dialog flow); Basic/Advanced tabs live inside PresetForm.
export function PresetsPage() {
  const t = useTranslations();
  const presetsQuery = usePresetsQuery();
  const deleteMut = useDeletePresetMutation();
  const exportMut = useRpExportMutation();
  const [editingId, setEditingId] = useState<EntityEditId>(null);

  const handleExport = (id: string) =>
    exportMut.mutate({ kind: "presets", id });

  const handleDelete = async (id: string) => {
    const ok = await confirmRpDelete(
      t,
      "COMMON.CONFIRM.DELETE_PRESET_TITLE",
      "COMMON.CONFIRM.DELETE_PRESET_DESC",
    );
    if (!ok) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({ entity: "presets", action: "deleted" });
    if (editingId === id) setEditingId(null);
  };

  return (
    <RpEntityPage
      titleKey="RP.PRESETS_TITLE"
      subtitleKey="RP.PRESETS_PAGE_SUBTITLE"
      newLabelKey="RP.PRESETS_NEW"
      backLabelKey="RP.PRESETS_BACK"
      isEditing={editingId !== null}
      onNew={() => {
        analytics.rp.entityAction({
          entity: "presets",
          action: "create_started",
        });
        setEditingId("new");
      }}
      onBack={() => setEditingId(null)}
      editor={
        editingId && (
          <PresetForm
            key={editingId}
            editingId={editingId}
            onDone={() => setEditingId(null)}
          />
        )
      }
      list={
        <div className="flex flex-col gap-2">
          {presetsQuery.data?.length === 0 && (
            <RpEmptyCard labelKey="RP.PRESETS_EMPTY" />
          )}
          {presetsQuery.data?.map((p) => (
            <RpEntityRow
              key={p.id}
              onOpen={() => {
                analytics.rp.entityAction({
                  entity: "presets",
                  action: "edit_started",
                });
                setEditingId(p.id);
              }}
              name={
                <>
                  {p.name}
                  {p.isDefault && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({t("RP.PRESET_DEFAULT").toLowerCase()})
                    </span>
                  )}
                </>
              }
              description={
                <>
                  T={p.temperature ?? t("RP.PRESET_SAMPLING_OFF")} | TopP=
                  {p.topP ?? t("RP.PRESET_SAMPLING_OFF")} | TopK=
                  {p.topK ?? t("RP.PRESET_SAMPLING_OFF")}
                </>
              }
              actions={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleExport(p.id);
                  }}
                  aria-label={t("RP.PRESETS_EXPORT")}
                >
                  <Icon name="download" className="size-4" />
                </Button>
              }
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      }
    />
  );
}
