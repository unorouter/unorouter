"use client";

import { RpLoginGate } from "@/components/pages/sidebar/chat/rp/rp-login-gate";
import { SyncBadge } from "@/components/elements/sync-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useDeletePresetMutation,
  usePresetsQuery,
} from "@/hooks/rp-hook";
import { analytics } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuArrowLeft, LuDownload, LuPlus, LuTrash2 } from "react-icons/lu";
import { PresetForm } from "./preset-form";

/**
 * Dedicated `/chat/presets` page. Sidebar icon links here. Replaces the
 * previous Dialog flow so power-users have more room for prompt + flag
 * editing. Tabs (Basic/Advanced) live inside <PresetForm>.
 */
export function PresetsPage() {
  const t = useTranslations();
  const isLoggedIn = !!useAuthQuery().data;
  const presetsQuery = usePresetsQuery();
  const deleteMut = useDeletePresetMutation();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <RpLoginGate />
      </div>
    );
  }

  const handleExport = async (id: string) => {
    const res = await fetch(`/api/rp/presets/${id}/export`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fname =
      res.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? `preset-${id}.json`;
    link.href = url;
    link.download = fname;
    link.click();
    URL.revokeObjectURL(url);
    analytics.rp.entityAction({ entity: "preset", action: "exported" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({ entity: "preset", action: "deleted" });
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">
            {t("RP.PRESETS_TITLE")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("RP.PRESETS_PAGE_SUBTITLE")}
          </p>
        </div>
        {!editingId && (
          <Button
            onClick={() => {
              analytics.rp.entityAction({
                entity: "preset",
                action: "create_started",
              });
              setEditingId("new");
            }}
          >
            <LuPlus className="mr-2 size-4" />
            {t("RP.PRESETS_NEW")}
          </Button>
        )}
        {editingId && (
          <Button variant="ghost" onClick={() => setEditingId(null)}>
            <LuArrowLeft className="mr-2 size-4" />
            {t("RP.PRESETS_BACK")}
          </Button>
        )}
      </div>

      {editingId ? (
        <Card className="p-4">
          <PresetForm
            editingId={editingId}
            onDone={() => setEditingId(null)}
          />
        </Card>
      ) : (
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
                  entity: "preset",
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
                  T={p.temperature ?? "off"} | TopP={p.topP ?? "off"} | TopK=
                  {p.topK ?? "off"}
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
                <LuDownload className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(p.id);
                }}
              >
                <LuTrash2 className="size-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
