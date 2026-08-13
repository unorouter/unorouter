"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import {
  useCreateJsPluginMutation,
  useDeleteJsPluginMutation,
  useJsPluginsQuery,
} from "@/hooks/ai/js-plugins-hook";
import { detectPluginKind } from "@/lib/ai/chat/plugins/engine";
import type { EntityEditId } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  confirmRpDelete,
  RpEmptyCard,
  RpEntityRow,
} from "../shared/rp-list-parts";
import { JsPluginEditor } from "./editor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Risu ships plugin metadata as `//@name` header comments; keep reading it so a
// plugin file imported from there names itself.
function parsePluginName(source: string, fallback: string): string {
  const match = /^\s*\/\/\s*@(?:display-)?name\s+(.+)$/m.exec(source);
  return match ? match[1].trim().slice(0, 200) : fallback;
}

export function JsPluginList(props: Props) {
  const t = useTranslations();
  const pluginsQuery = useJsPluginsQuery();
  const deleteMut = useDeleteJsPluginMutation();
  const createMut = useCreateJsPluginMutation();
  const [editingId, setEditingId] = useState<EntityEditId>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset editor when dialog closes
    if (!props.open) setEditingId(null);
  }, [props.open]);

  const handleDelete = async (id: string) => {
    const ok = await confirmRpDelete(
      t,
      "CHAT.JS_PLUGIN.DELETE_TITLE",
      "CHAT.JS_PLUGIN.DELETE_DESC",
    );
    if (!ok) return;
    await deleteMut.mutateAsync(id);
    if (editingId === id) setEditingId(null);
  };

  const handleImport = async (file: File) => {
    const script = await file.text();
    if (!script.trim()) return;
    await createMut.mutateAsync({
      body: {
        name: parsePluginName(script, file.name.replace(/\.[jt]s$/i, "")),
        script,
        kind: detectPluginKind(script),
        enabled: true,
      },
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("CHAT.JS_PLUGIN.TITLE")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap justify-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".js,.ts,text/javascript,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleImport(file);
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" className="size-4" />
              <span className="truncate">{t("CHAT.JS_PLUGIN.IMPORT")}</span>
            </Button>
            <Button onClick={() => setEditingId("new")}>
              <Icon name="plus" className="size-4" />
              <span className="truncate">{t("CHAT.JS_PLUGIN.NEW")}</span>
            </Button>
          </div>

          {pluginsQuery.data?.length === 0 && editingId !== "new" && (
            <RpEmptyCard labelKey="CHAT.JS_PLUGIN.EMPTY" />
          )}

          {editingId && (
            <JsPluginEditor
              key={editingId}
              editingId={editingId}
              onDone={() => setEditingId(null)}
            />
          )}

          {!editingId && (
            <div className="flex flex-col gap-2">
              {pluginsQuery.data?.map((plugin) => (
                <RpEntityRow
                  key={plugin.id}
                  onOpen={() => setEditingId(plugin.id)}
                  leading={
                    <Avatar className="size-10">
                      <AvatarFallback>
                        <Icon name="code" className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  }
                  name={plugin.name}
                  description={t(
                    plugin.enabled
                      ? plugin.kind === "janitor"
                        ? "CHAT.JS_PLUGIN.SUMMARY_JANITOR"
                        : "CHAT.JS_PLUGIN.SUMMARY_UNO"
                      : "CHAT.JS_PLUGIN.SUMMARY_DISABLED",
                  )}
                  onDelete={() => handleDelete(plugin.id)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
