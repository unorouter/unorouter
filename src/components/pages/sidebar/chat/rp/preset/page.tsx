"use client";

import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { SyncBadge } from "@/components/elements/badge/sync-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

/**
 * Dedicated `/chat/presets` page. Sidebar icon links here. Replaces the
 * previous Dialog flow so power-users have more room for prompt + flag
 * editing. Tabs (Basic/Advanced) live inside <PresetForm>.
 */
export function PresetsPage() {
  const t = useTranslations();
  const presetsQuery = usePresetsQuery();
  const deleteMut = useDeletePresetMutation();
  const exportMut = useRpExportMutation();
  const [editingId, setEditingId] = useState<EntityEditId>(null);

  const handleExport = (id: string) =>
    exportMut.mutate({ kind: "presets", id });

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.DELETE_PRESET_TITLE"),
      description: t("COMMON.CONFIRM.DELETE_PRESET_DESC"),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
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
            <Card className="text-muted-foreground py-10 text-center text-sm">
              {t("RP.PRESETS_EMPTY")}
            </Card>
          )}
          {presetsQuery.data?.map((p) => (
            <Card
              key={p.id}
              className="hover:bg-accent flex cursor-pointer flex-row items-center gap-3 p-3 transition-colors"
              onClick={() => {
                analytics.rp.entityAction({
                  entity: "presets",
                  action: "edit_started",
                });
                setEditingId(p.id);
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">
                  {p.name}
                  {p.isDefault && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({t("RP.PRESET_DEFAULT").toLowerCase()})
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  T={p.temperature ?? t("RP.PRESET_SAMPLING_OFF")} | TopP=
                  {p.topP ?? t("RP.PRESET_SAMPLING_OFF")} | TopK=
                  {p.topK ?? t("RP.PRESET_SAMPLING_OFF")}
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <SyncBadge kind="presets" id={p.id} payload={p} compact />
              </div>
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
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(p.id);
                }}
              >
                <Icon name="trash-2" className="size-4" />
              </Button>
            </Card>
          ))}
        </div>
      }
    />
  );
}
