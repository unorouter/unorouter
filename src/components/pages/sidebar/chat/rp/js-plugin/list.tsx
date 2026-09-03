"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  useCreateJsPluginMutation,
  useDeleteJsPluginMutation,
  useImportJsPluginFromUrlMutation,
  useJsPluginsQuery,
} from "@/hooks/ai/js-plugins-hook";
import { detectPluginKind } from "@/lib/ai/chat/plugins/engine";
import type { EntityEditId } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  confirmRpDelete,
  RpEntityRow,
  rpFilter,
  RpImportControl,
  RpListDialog,
} from "../shared/rp-list-parts";
import { JsPluginEditor } from "./editor";
import { useRpExportMutation } from "@/hooks/ai/rp/use-export-mutation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Risu ships plugin metadata as `//@name` header comments.
function parsePluginName(source: string, fallback: string): string {
  const match = /^\s*\/\/\s*@(?:display-)?name\s+(.+)$/m.exec(source);
  return match ? match[1].trim().slice(0, 200) : fallback;
}

export function JsPluginList(props: Props) {
  const t = useTranslations();
  const pluginsQuery = useJsPluginsQuery();
  const [rpQuery, setRpQuery] = useState("");
  const deleteMut = useDeleteJsPluginMutation();
  const exportMut = useRpExportMutation();
  const createMut = useCreateJsPluginMutation();
  const importUrlMut = useImportJsPluginFromUrlMutation();
  const [editingId, setEditingId] = useState<EntityEditId>(null);

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
    <RpListDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      titleKey="CHAT.JS_PLUGIN.TITLE"
      emptyKey="CHAT.JS_PLUGIN.EMPTY"
      isEmpty={pluginsQuery.data?.length === 0 && editingId !== "new"}
      editingId={editingId}
      setEditingId={setEditingId}
      query={rpQuery}
      setQuery={setRpQuery}
      actionsClassName="flex flex-wrap justify-end gap-2"
      actions={
        <>
          <RpImportControl
            entity="js_plugins"
            accept=".js,.ts,text/javascript,text/plain"
            labelKey="CHAT.JS_PLUGIN.IMPORT"
            isPending={createMut.isPending || importUrlMut.isPending}
            onFile={handleImport}
            onUrl={(input) => importUrlMut.mutateAsync(input).then(() => {})}
            urlLabelKey="CHAT.JS_PLUGIN.IMPORT_LINK"
            urlPlaceholderKey="CHAT.JS_PLUGIN.IMPORT_LINK_PLACEHOLDER"
          />
          <Button onClick={() => setEditingId("new")}>
            <Icon name="plus" className="size-4" />
            <span className="truncate">{t("CHAT.JS_PLUGIN.NEW")}</span>
          </Button>
        </>
      }
      editor={
        editingId && (
          <JsPluginEditor
            key={editingId}
            editingId={editingId}
            onDone={() => setEditingId(null)}
          />
        )
      }
    >
      {rpFilter(pluginsQuery.data, rpQuery, (plugin) => [plugin.name]).map(
        (plugin) => (
          <RpEntityRow
            createdAt={plugin.createdAt}
            updatedAt={plugin.updatedAt}
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
            actions={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  exportMut.mutate({ kind: "js_plugins", id: plugin.id });
                }}
                aria-label={t("CHAT.JS_PLUGIN.EXPORT")}
              >
                <Icon name="download" className="size-4" />
              </Button>
            }
            onDelete={() => handleDelete(plugin.id)}
          />
        ),
      )}
    </RpListDialog>
  );
}
