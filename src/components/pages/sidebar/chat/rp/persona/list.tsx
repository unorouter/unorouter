"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useEffect, useState } from "react";
import {
  confirmRpDelete,
  RpEmptyCard,
  RpEntityRow,
  rpFilter,
  RP_ACTION_BUTTON,
  RpImportControl,
} from "../shared/rp-list-parts";
import { PersonaEditor } from "./editor";

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
  const importMut = useImportPersonaMutation();
  const importUrlMut = useImportPersonaFromUrlMutation();

  const [editingId, setEditingId] = useState<EntityEditId>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset editor when dialog closes
    if (!props.open) setEditingId(null);
  }, [props.open]);

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
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("RP.PERSONAS_TITLE")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <RpImportControl
              entity="personas"
              accept="application/json"
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
          </div>

          {personasQuery.data?.length === 0 && editingId !== "new" && (
            <RpEmptyCard labelKey="RP.PERSONAS_EMPTY" />
          )}

          {editingId && (
            <PersonaEditor
              key={editingId}
              editingId={editingId}
              onDone={() => setEditingId(null)}
            />
          )}

          {!editingId && (
            <>
              <Input
                value={rpQuery}
                onChange={(e) => setRpQuery(e.target.value)}
                placeholder={t("RP.LIST_SEARCH")}
                aria-label={t("RP.LIST_SEARCH")}
              />

              <div className="flex flex-col gap-2">
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
                    leading={
                      <Avatar className="size-10">
                        <AvatarFallback>
                          {p.name[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    }
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
                    onDuplicate={() => duplicateMut.mutate(p.id)}
                    onDelete={() => handleDelete(p.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
