"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useCreatePresetMutation,
  useDeletePresetMutation,
  usePresetsQuery,
  useUpdatePresetMutation,
} from "@/hooks/rp-hook";
import { RpLoginGate } from "./rp-login-gate";
import {
  samplingPresetFormSchema,
  type SamplingPresetForm,
} from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { SamplingFields } from "./sampling-fields";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PresetList(props: Props) {
  const t = useTranslations();
  const isLoggedIn = !!useAuthQuery().data;
  const presetsQuery = usePresetsQuery();
  const createMut = useCreatePresetMutation();
  const updateMut = useUpdatePresetMutation();
  const deleteMut = useDeletePresetMutation();

  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const form = useForm({
    resolver: typeboxResolver(samplingPresetFormSchema),
    defaultValues: Value.Default(
      samplingPresetFormSchema,
      {},
    ) as SamplingPresetForm,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset editor when dialog closes
    if (!props.open) setEditingId(null);
  }, [props.open]);

  // Re-seed when entering the editor.
  useEffect(() => {
    if (editingId === "new") {
      form.reset(
        Value.Default(samplingPresetFormSchema, {}) as SamplingPresetForm,
      );
      return;
    }
    if (!editingId) return;
    const p = presetsQuery.data?.find((x) => x.id === editingId);
    if (!p) return;
    form.reset({
      name: p.name,
      temperature: p.temperature ?? null,
      topP: p.topP ?? null,
      topK: p.topK ?? null,
      minP: p.minP ?? null,
      topA: p.topA ?? null,
      frequencyPenalty: p.frequencyPenalty ?? null,
      presencePenalty: p.presencePenalty ?? null,
      repetitionPenalty: p.repetitionPenalty ?? null,
      maxTokens: p.maxTokens ?? null,
      isDefault: p.isDefault ?? false,
    });
    // form.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, presetsQuery.data]);

  const resetSampling = () => {
    (
      [
        "temperature",
        "topP",
        "topK",
        "minP",
        "topA",
        "frequencyPenalty",
        "presencePenalty",
        "repetitionPenalty",
        "maxTokens",
      ] as const
    ).forEach((k) => form.setValue(k, null, { shouldDirty: true }));
  };

  const onSubmit = async (data: SamplingPresetForm) => {
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
    if (editingId === id) setEditingId(null);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("RP.PRESETS_TITLE")}</DialogTitle>
        </DialogHeader>

        {!isLoggedIn ? <RpLoginGate /> : <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button onClick={() => setEditingId("new")}>
              <LuPlus className="size-4" />
              {t("RP.PRESETS_NEW")}
            </Button>
          </div>

          {presetsQuery.data?.length === 0 && editingId !== "new" && (
            <Card className="text-muted-foreground py-10 text-center text-sm">
              {t("RP.PRESETS_EMPTY")}
            </Card>
          )}

          {editingId && (
            <Card className="flex flex-col gap-4 p-4">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex flex-col gap-4"
                >
                  <MyFormInput
                    control={form.control}
                    name="name"
                    schema={samplingPresetFormSchema}
                    label={t("COMMON.NAME")}
                  />

                  <SamplingFields
                    control={form.control}
                    names={{
                      temperature: "temperature",
                      topP: "topP",
                      topK: "topK",
                      minP: "minP",
                      topA: "topA",
                      frequencyPenalty: "frequencyPenalty",
                      presencePenalty: "presencePenalty",
                      repetitionPenalty: "repetitionPenalty",
                      maxTokens: "maxTokens",
                    }}
                    onReset={resetSampling}
                  />

                  <MyFormSwitch
                    control={form.control}
                    name="isDefault"
                    label={t("RP.PRESET_DEFAULT")}
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
              {presetsQuery.data?.map((p) => (
                <Card
                  key={p.id}
                  className="hover:bg-accent flex flex-row cursor-pointer items-center gap-3 p-3 transition-colors"
                  onClick={() => setEditingId(p.id)}
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
                      T={p.temperature ?? "off"} | TopP={p.topP ?? "off"} |
                      TopK={p.topK ?? "off"}
                    </span>
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
          )}
        </div>}
      </DialogContent>
    </Dialog>
  );
}
