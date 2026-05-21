"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreatePresetMutation,
  usePresetsQuery,
  useUpdatePresetMutation,
} from "@/hooks/ai/rp/presets";
import {
  SAMPLING_FIELDS,
  samplingPresetFormSchema,
  type SamplingPresetForm,
} from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm, type Path } from "react-hook-form";
import { SamplingFields } from "../sampling-fields";

type Props = {
  editingId: string | "new";
  onDone: () => void;
};

export function PresetForm(props: Props) {
  const t = useTranslations();
  const presetsQuery = usePresetsQuery();
  const createMut = useCreatePresetMutation();
  const updateMut = useUpdatePresetMutation();

  const form = useForm({
    resolver: typeboxResolver(samplingPresetFormSchema),
    defaultValues: Value.Default(
      samplingPresetFormSchema,
      {},
    ) as SamplingPresetForm,
  });

  useEffect(() => {
    if (props.editingId === "new") {
      form.reset(
        Value.Default(samplingPresetFormSchema, {}) as SamplingPresetForm,
      );
      return;
    }
    const p = presetsQuery.data?.find((x) => x.id === props.editingId);
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
      mainPrompt: p.mainPrompt ?? "",
      postHistory: p.postHistory ?? "",
      prefill: p.prefill ?? "",
      forceAlternateRoles: p.forceAlternateRoles ?? false,
      noSystemRole: p.noSystemRole ?? false,
      mustStartWithUserInput: p.mustStartWithUserInput ?? false,
      skipPrefillIfLastIsAssistant: p.skipPrefillIfLastIsAssistant ?? false,
      geminiBlockOff: p.geminiBlockOff ?? false,
      isDefault: p.isDefault ?? false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.editingId, presetsQuery.data]);

  const resetSampling = () => {
    SAMPLING_FIELDS.forEach((k) =>
      form.setValue(k, null, { shouldDirty: true }),
    );
  };

  // SamplingFields names every knob to its own field path 1:1.
  const samplingNames = Object.fromEntries(
    SAMPLING_FIELDS.map((f) => [f, f]),
  ) as Record<(typeof SAMPLING_FIELDS)[number], Path<SamplingPresetForm>>;

  const onSubmit = async (data: SamplingPresetForm) => {
    if (props.editingId === "new") {
      await createMut.mutateAsync({ body: data });
    } else {
      await updateMut.mutateAsync({ id: props.editingId, body: data });
    }
    props.onDone();
  };

  return (
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

        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">{t("RP.PRESET_TAB_BASIC")}</TabsTrigger>
            <TabsTrigger value="advanced">
              {t("RP.PRESET_TAB_ADVANCED")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <SamplingFields
              control={form.control}
              names={samplingNames}
              onReset={resetSampling}
            />
            <div className="mt-4">
              <MyFormSwitch
                control={form.control}
                name="isDefault"
                label={t("RP.PRESET_DEFAULT")}
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="mt-4 flex flex-col gap-4">
            <div className="border-warning/40 bg-warning/5 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">
                {t("RP.PRESET_ADVANCED_WARNING")}
              </p>
            </div>

            <MyFormTextarea
              control={form.control}
              name="mainPrompt"
              schema={samplingPresetFormSchema}
              label={t("RP.PRESET_MAIN_PROMPT")}
              rows={4}
              placeholder={t("RP.PRESET_MAIN_PROMPT_PLACEHOLDER")}
              description={t("RP.PRESET_MAIN_PROMPT_HINT")}
            />
            <MyFormTextarea
              control={form.control}
              name="postHistory"
              schema={samplingPresetFormSchema}
              label={t("RP.PRESET_POST_HISTORY")}
              rows={4}
              placeholder={t("RP.PRESET_POST_HISTORY_PLACEHOLDER")}
              description={t("RP.PRESET_POST_HISTORY_HINT")}
            />
            <MyFormTextarea
              control={form.control}
              name="prefill"
              schema={samplingPresetFormSchema}
              label={t("RP.PRESET_PREFILL")}
              rows={4}
              placeholder={t("RP.PRESET_PREFILL_PLACEHOLDER")}
              description={t("RP.PRESET_PREFILL_HINT")}
            />

            <div className="border-border/40 flex flex-col gap-3 rounded-lg border p-3">
              <div className="text-foreground text-xs font-medium tracking-wide uppercase">
                {t("RP.PRESET_FLAGS_TITLE")}
              </div>
              <p className="text-muted-foreground text-xs">
                {t("RP.PRESET_FLAGS_HINT")}
              </p>
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="forceAlternateRoles"
                  label={t("RP.PRESET_FORCE_ALTERNATE_ROLES")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_FORCE_ALTERNATE_ROLES_HINT")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="noSystemRole"
                  label={t("RP.PRESET_NO_SYSTEM_ROLE")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_NO_SYSTEM_ROLE_HINT")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="mustStartWithUserInput"
                  label={t("RP.PRESET_MUST_START_WITH_USER")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_MUST_START_WITH_USER_HINT")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="skipPrefillIfLastIsAssistant"
                  label={t("RP.PRESET_SKIP_PREFILL_IF_LAST_ASSISTANT")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_SKIP_PREFILL_IF_LAST_ASSISTANT_HINT")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="geminiBlockOff"
                  label={t("RP.PRESET_GEMINI_BLOCK_OFF")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_GEMINI_BLOCK_OFF_HINT")}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={props.onDone}>
            {t("COMMON.CANCEL")}
          </Button>
          <Button type="submit">{t("COMMON.SAVE")}</Button>
        </div>
      </form>
    </Form>
  );
}
