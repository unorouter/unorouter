"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Icon } from "@/components/ui/icon";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreatePersonaMutation,
  useDeletePersonaMutation,
  useImportPersonaMutation,
  usePersonasQuery,
  useUpdatePersonaMutation,
} from "@/hooks/rp/personas";
import { analytics } from "@/lib/analytics";
import { personaFormSchema, type PersonaForm } from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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
  const importMut = useImportPersonaMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      await importMut.mutateAsync(file);
      analytics.rp.entityAction({ entity: "persona", action: "imported" });
    } catch {
      analytics.rp.entityAction({
        entity: "persona",
        action: "import_failed",
      });
    }
  };

  const form = useForm({
    resolver: typeboxResolver(personaFormSchema),
    defaultValues: Value.Default(personaFormSchema, {}) as PersonaForm,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset editor when dialog closes
    if (!props.open) setEditingId(null);
  }, [props.open]);

  useEffect(() => {
    if (editingId === "new") {
      form.reset(Value.Default(personaFormSchema, {}) as PersonaForm);
      return;
    }
    if (!editingId) return;
    const p = personasQuery.data?.find((x) => x.id === editingId);
    if (!p) return;
    form.reset({
      name: p.name,
      description: p.description ?? "",
      isDefault: p.isDefault ?? false,
    });
    // form.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, personasQuery.data]);

  const onSubmit = async (data: PersonaForm) => {
    if (editingId === "new") {
      await createMut.mutateAsync({ body: data });
    } else if (editingId) {
      await updateMut.mutateAsync({ id: editingId, body: data });
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("COMMON.CONFIRM_DELETE"))) return;
    await deleteMut.mutateAsync(id);
    analytics.rp.entityAction({ entity: "persona", action: "deleted" });
    if (editingId === id) setEditingId(null);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("RP.PERSONAS_TITLE")}</DialogTitle>
        </DialogHeader>

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
                    entity: "persona",
                    action: "import_picker_opened",
                  });
                  fileInputRef.current?.click();
                }}
                disabled={importMut.isPending}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <Icon name="upload" className="size-4" />
                <span className="truncate">{t("RP.PERSONAS_IMPORT")}</span>
              </Button>
              <Button
                onClick={() => {
                  analytics.rp.entityAction({
                    entity: "persona",
                    action: "create_started",
                  });
                  setEditingId("new");
                }}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                <Icon name="plus" className="size-4" />
                <span className="truncate">{t("RP.PERSONAS_NEW")}</span>
              </Button>
            </div>

            {personasQuery.data?.length === 0 && editingId !== "new" && (
              <Card className="text-muted-foreground py-10 text-center text-sm">
                {t("RP.PERSONAS_EMPTY")}
              </Card>
            )}

            {editingId && (
              <Card className="flex flex-col gap-3 p-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-3"
                  >
                    <MyFormInput
                      control={form.control}
                      name="name"
                      schema={personaFormSchema}
                      label={t("COMMON.NAME")}
                    />
                    <span className="text-muted-foreground -mt-2 text-xs">
                      {t("RP.PERSONA_NAME_HINT")}
                    </span>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("COMMON.DESCRIPTION")}</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <MyFormSwitch
                      control={form.control}
                      name="isDefault"
                      label={t("RP.PERSONA_DEFAULT")}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        {t("COMMON.CANCEL")}
                      </Button>
                      <Button type="submit">{t("COMMON.SAVE")}</Button>
                    </div>
                  </form>
                </Form>
              </Card>
            )}

            {!editingId && (
              <div className="flex flex-col gap-2">
                {personasQuery.data?.map((p) => (
                  <Card
                    key={p.id}
                    className="hover:bg-accent flex cursor-pointer flex-row items-center gap-3 p-3 transition-colors"
                    onClick={() => {
                      analytics.rp.entityAction({
                        entity: "persona",
                        action: "edit_started",
                      });
                      setEditingId(p.id);
                    }}
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
                    <div onClick={(e) => e.stopPropagation()}>
                      <SyncBadge
                        kind="personas"
                        id={p.id}
                        payload={p}
                        compact
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                    >
                      <Icon name="trash-2" className="size-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
      </DialogContent>
    </Dialog>
  );
}
