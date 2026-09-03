"use client";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  useDeletePersonaMutation,
  useDuplicatePersonaMutation,
  useImportPersonaFromUrlMutation,
  useImportPersonaMutation,
  usePersonasQuery,
} from "@/hooks/ai/rp/personas";
import { analytics } from "@/lib/analytics";
import type { EntityEditId } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  confirmRpDelete,
  RpAvatar,
  RpEntityRow,
  rpFilter,
  RP_ACTION_BUTTON,
  RpImportControl,
  RpListDialog,
} from "../shared/rp-list-parts";
import { PersonaEditor } from "./editor";
import { useRpExportMutation } from "@/hooks/ai/rp/use-export-mutation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PersonaList(props: Props) {
  const t = useTranslations();
  const personasQuery = usePersonasQuery();
  const [rpQuery, setRpQuery] = useState("");
  const deleteMut = useDeletePersonaMutation();
  const duplicateMut = useDuplicatePersonaMutation();
  const exportMut = useRpExportMutation();
  const importMut = useImportPersonaMutation();
  const importUrlMut = useImportPersonaFromUrlMutation();

  const [editingId, setEditingId] = useState<EntityEditId>(null);

  const handleDelete = async (id: string) => {
    const ok = await confirmRpDelete(
      t,
      "COMMON.CONFIRM.DELETE_PERSONA_TITLE",
      "COMMON.CONFIRM.DELETE_PERSONA_DESC",
    );
    if (!ok) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({ entity: "personas", action: "deleted" });
    if (editingId === id) setEditingId(null);
  };

  return (
    <RpListDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      titleKey="RP.PERSONAS_TITLE"
      emptyKey="RP.PERSONAS_EMPTY"
      isEmpty={personasQuery.data?.length === 0 && editingId !== "new"}
      editingId={editingId}
      setEditingId={setEditingId}
      query={rpQuery}
      setQuery={setRpQuery}
      actions={
        <>
          <RpImportControl
            entity="personas"
            accept=".json,application/json"
            labelKey="RP.PERSONAS_IMPORT"
            isPending={importMut.isPending || importUrlMut.isPending}
            onFile={(file) => importMut.mutateAsync(file).then(() => {})}
            onUrl={(input) => importUrlMut.mutateAsync(input).then(() => {})}
            urlLabelKey="RP.PERSONAS_IMPORT_LINK"
            urlPlaceholderKey="RP.PERSONAS_IMPORT_LINK_PLACEHOLDER"
          />
          <Button
            onClick={() => {
              analytics.rp.entityAction({
                entity: "personas",
                action: "create_started",
              });
              setEditingId("new");
            }}
            className={RP_ACTION_BUTTON}
          >
            <Icon name="plus" className="size-4" />
            {t("RP.PERSONAS_NEW")}
          </Button>
        </>
      }
      editor={
        editingId && (
          <PersonaEditor
            key={editingId}
            editingId={editingId}
            onDone={() => setEditingId(null)}
          />
        )
      }
    >
      {rpFilter(personasQuery.data, rpQuery, (p) => [
        p.name,
        p.description,
      ]).map((p) => (
        <RpEntityRow
          createdAt={p.createdAt}
          updatedAt={p.updatedAt}
          key={p.id}
          onOpen={() => {
            analytics.rp.entityAction({
              entity: "personas",
              action: "edit_started",
            });
            setEditingId(p.id);
          }}
          leading={<RpAvatar mediaId={p.avatarMediaId} name={p.name} />}
          name={
            <>
              {p.title || p.name}
              {p.title && (
                <span className="text-muted-foreground ml-2 text-xs">
                  {p.name}
                </span>
              )}
              {p.isDefault && (
                <span className="text-muted-foreground ml-2 text-xs">
                  ({t("RP.PERSONA_DEFAULT").toLowerCase()})
                </span>
              )}
            </>
          }
          description={p.description}
          actions={
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                exportMut.mutate({ kind: "personas", id: p.id });
              }}
              aria-label={t("RP.PERSONAS_EXPORT")}
            >
              <Icon name="download" className="size-4" />
            </Button>
          }
          onDuplicate={() => duplicateMut.mutate(p.id)}
          onDelete={() => handleDelete(p.id)}
        />
      ))}
    </RpListDialog>
  );
}
