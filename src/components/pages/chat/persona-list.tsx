"use client";
/* eslint-disable react-hooks/set-state-in-effect -- form initialized once when row clicked */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreatePersonaMutation,
  useDeletePersonaMutation,
  usePersonasQuery,
  useUpdatePersonaMutation,
} from "@/hooks/rp-hook";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PersonaList(props: Props) {
  const t = useTranslations();
  const personasQuery = usePersonasQuery();
  const createMut = useCreatePersonaMutation();
  const updateMut = useUpdatePersonaMutation();
  const deleteMut = useDeletePersonaMutation();

  const [editingId, setEditingIdRaw] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!props.open) setEditingIdRaw(null);
  }, [props.open]);

  // Direct setter that synchronously seeds the form, so typing can't race
  // against a refetch-triggered re-seed.
  const setEditingId = (id: string | "new" | null) => {
    setEditingIdRaw(id);
    if (id === "new") {
      setName("");
      setDescription("");
      setIsDefault(false);
    } else if (id) {
      const p = personasQuery.data?.find((x) => x.id === id);
      if (p) {
        setName(p.name);
        setDescription(p.description ?? "");
        setIsDefault(p.isDefault ?? false);
      }
    }
  };

  const handleSave = async () => {
    if (editingId === "new") {
      await createMut.mutateAsync({
        body: { name, description, isDefault },
      });
    } else if (editingId) {
      await updateMut.mutateAsync({
        id: editingId,
        body: { name, description, isDefault },
      });
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync(id);
    if (editingId === id) setEditingId(null);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("RP.PERSONAS_TITLE")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button onClick={() => setEditingId("new")}>
              <LuPlus className="size-4" />
              {t("RP.PERSONAS_NEW")}
            </Button>
          </div>

          {personasQuery.data?.length === 0 && editingId !== "new" && (
            <Card className="text-muted-foreground py-10 text-center text-sm">
              {t("RP.PERSONAS_EMPTY")}
            </Card>
          )}

          {editingId && (
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-2">
                <Label>{t("COMMON.NAME")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">
                  {t("RP.PERSONA_NAME_HINT")}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("COMMON.DESCRIPTION")}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t("RP.PERSONA_DEFAULT")}</Label>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditingId(null)}>
                  {t("COMMON.CANCEL")}
                </Button>
                <Button onClick={handleSave} disabled={!name}>
                  {t("COMMON.SAVE")}
                </Button>
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            {personasQuery.data?.map((p) => (
              <Card
                key={p.id}
                className="hover:bg-accent flex cursor-pointer items-center gap-3 p-3 transition-colors"
                onClick={() => setEditingId(p.id)}
              >
                <div className="bg-muted flex size-10 items-center justify-center rounded-full text-sm">
                  {p.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {p.name}
                    {p.isDefault && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({t("RP.PERSONA_DEFAULT").toLowerCase()})
                      </span>
                    )}
                  </span>
                  {p.description && (
                    <span className="text-muted-foreground truncate text-xs">
                      {p.description}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p.id);
                  }}
                >
                  <LuTrash2 className="size-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
