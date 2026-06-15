"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STARTER_PRESETS } from "@/lib/ai/rp/starter-presets";
import {
  useCreatePresetMutation,
  usePresetsQuery,
  useUpdatePresetMutation,
} from "@/hooks/ai/rp/presets";
import { formDefaults } from "@/lib/validation/helpers";
import {
  SAMPLING_FIELDS,
  samplingPresetFormSchema,
  type SamplingPresetForm,
} from "@/lib/validation/rp-forms";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import { useTranslations } from "next-intl";
import { FormFooter } from "../shared/form-footer";
import type { Path } from "react-hook-form";
import { SamplingFields } from "../sampling-fields";
import { PromptTemplateEditor } from "./prompt-template-editor";

type Props = {
  editingId: string | "new";
  onDone: () => void;
};

// providers column is a JSON routing object; the form edits it as a comma list of slugs plus an only toggle.
function parseProviderRouting(raw: string | null | undefined): {
  slugs: string;
  only: boolean;
} {
  if (!raw) return { slugs: "", only: false };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const only = Array.isArray(parsed.only);
    const list = (only ? parsed.only : parsed.order) as unknown;
    const slugs = Array.isArray(list) ? list.map(String).join(", ") : "";
    return { slugs, only };
  } catch {
    return { slugs: "", only: false };
  }
}

// Build the DB body: serialize provider slugs into the providers JSON and drop the form-only providersOnly field.
function toPresetBody(data: SamplingPresetForm) {
  const slugs = data.providers
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const providers =
    slugs.length > 0
      ? JSON.stringify(data.providersOnly ? { only: slugs } : { order: slugs })
      : null;
  // Empty template string => null so the assembler uses the default order.
  const promptTemplate = data.promptTemplate?.trim()
    ? data.promptTemplate
    : null;
  const body = { ...data, providers, promptTemplate } as Omit<
    SamplingPresetForm,
    "providersOnly"
  > & {
    providers: string | null;
    promptTemplate: string | null;
    providersOnly?: boolean;
  };
  delete body.providersOnly;
  return body;
}

export function PresetForm(props: Props) {
  const t = useTranslations();
  const presetsQuery = usePresetsQuery();
  const createMut = useCreatePresetMutation();
  const updateMut = useUpdatePresetMutation();

  // values syncs the row on settle; keepDirtyValues stops a refetch clobbering typing.
  const editing =
    props.editingId === "new"
      ? null
      : presetsQuery.data?.find((x) => x.id === props.editingId);
  // providers is a JSON routing object; the form edits it as a comma list + only toggle, so expand before seeding.
  const routing = parseProviderRouting(editing?.providers);
  // null streamingEnabled means inherit (on) but the switch renders null as OFF; seed the default so toggling off persists false.
  const formValues = formDefaults(samplingPresetFormSchema, {
    ...(editing ?? {}),
    providers: routing.slugs,
    providersOnly: routing.only,
    promptTemplate: editing?.promptTemplate ?? "",
    streamingEnabled: editing?.streamingEnabled ?? true,
  });
  const form = useRpForm(samplingPresetFormSchema, formValues);

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
    const body = toPresetBody(data);
    if (props.editingId === "new") {
      await createMut.mutateAsync({ body });
    } else {
      await updateMut.mutateAsync({ id: props.editingId, body });
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

        {props.editingId === "new" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("RP.STARTER_PRESET_LOAD")}
            </label>
            <Select
              value=""
              onValueChange={(slug) => {
                const sp = STARTER_PRESETS.find((s) => s.slug === slug);
                if (!sp) return;
                form.reset(formDefaults(samplingPresetFormSchema, sp.body));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("RP.STARTER_PRESET_PLACEHOLDER")} />
              </SelectTrigger>
              <SelectContent>
                {STARTER_PRESETS.map((sp) => (
                  <SelectItem key={sp.slug} value={sp.slug}>
                    {t(sp.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {t("RP.STARTER_PRESET_HINT")}
            </p>
          </div>
        )}

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
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <MyFormInput
                  control={form.control}
                  name="chatMemory"
                  schema={samplingPresetFormSchema}
                  label={t("RP.PRESET_CHAT_MEMORY")}
                  type="number"
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_CHAT_MEMORY_HINT")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="streamingEnabled"
                  label={t("RP.PRESET_STREAMING")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_STREAMING_HINT")}
                </p>
              </div>
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
                {t("RP.PRESET_PROVIDERS_TITLE")}
              </div>
              <div className="flex flex-col gap-1">
                <MyFormInput
                  control={form.control}
                  name="providers"
                  schema={samplingPresetFormSchema}
                  label={t("RP.PRESET_PROVIDERS")}
                  placeholder="novita, deepinfra"
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_PROVIDERS_HINT")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="providersOnly"
                  label={t("RP.PRESET_PROVIDERS_ONLY")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_PROVIDERS_ONLY_HINT")}
                </p>
              </div>
            </div>

            <div className="border-border/40 flex flex-col gap-3 rounded-lg border p-3">
              <PromptTemplateEditor
                value={form.watch("promptTemplate") ?? ""}
                onChange={(json) =>
                  form.setValue("promptTemplate", json, { shouldDirty: true })
                }
              />
            </div>

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

        <FormFooter onCancel={props.onDone} />
      </form>
    </Form>
  );
}
