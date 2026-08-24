"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { MyFormTextarea } from "@/components/elements/form/my-form-textarea";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ImageModelField,
  UtilityModelField,
} from "@/components/pages/sidebar/chat/overrides/model-fields";
import { IMAGE_STYLE_TEMPLATES } from "@/lib/ai/chat/image-style-templates";
import { AUTO_GROUP, NONE_VALUE } from "@/lib/config/constants";
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
import { TokenizerSelect } from "../tokenizer-select";
import { PromptTemplateEditor } from "./prompt-template-editor";

type Props = {
  editingId: string | "new";
  onDone: () => void;
};

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

function toPresetBody(data: SamplingPresetForm) {
  const slugs = data.providers
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const providers =
    slugs.length > 0
      ? JSON.stringify(data.providersOnly ? { only: slugs } : { order: slugs })
      : null;
  const promptTemplate = data.promptTemplate?.trim()
    ? data.promptTemplate
    : null;
  // The pickers write the sentinels rather than "", and both are TRUTHY, so
  // storing them verbatim would send "__none__" upstream as a model name (the
  // readers are `settings.utilityModel || body.model`) and pin a lane called
  // "auto" that no channel serves.
  const unset = (v: string) => (v && v !== NONE_VALUE ? v : null);
  const unpinned = (v: string) => (v && v !== AUTO_GROUP ? v : null);
  const body = {
    ...data,
    providers,
    promptTemplate,
    utilityModel: unset(data.utilityModel),
    titleModel: unset(data.titleModel),
    imageModel: unset(data.imageModel),
    utilityGroup: unpinned(data.utilityGroup),
    titleGroup: unpinned(data.titleGroup),
    imageGroup: unpinned(data.imageGroup),
  } as Omit<
    SamplingPresetForm,
    | "providersOnly"
    | "utilityModel"
    | "titleModel"
    | "imageModel"
    | "utilityGroup"
    | "titleGroup"
    | "imageGroup"
  > & {
    providers: string | null;
    promptTemplate: string | null;
    providersOnly?: boolean;
    utilityModel: string | null;
    titleModel: string | null;
    imageModel: string | null;
    utilityGroup: string | null;
    titleGroup: string | null;
    imageGroup: string | null;
  };
  delete body.providersOnly;
  return body;
}

export function PresetForm(props: Props) {
  const t = useTranslations();
  const presetsQuery = usePresetsQuery();
  const createMut = useCreatePresetMutation();
  const updateMut = useUpdatePresetMutation();

  const editing =
    props.editingId === "new"
      ? null
      : presetsQuery.data?.find((x) => x.id === props.editingId);
  const routing = parseProviderRouting(editing?.providers);
  const formValues = formDefaults(samplingPresetFormSchema, {
    ...(editing ?? {}),
    providers: routing.slugs,
    providersOnly: routing.only,
    promptTemplate: editing?.promptTemplate ?? "",
    postHistoryRole: editing?.postHistoryRole ?? "system",
    streamingEnabled: editing?.streamingEnabled ?? true,
    autoScrollStream: editing?.autoScrollStream ?? true,
    showReasoning: editing?.showReasoning ?? true,
  });
  const form = useRpForm(samplingPresetFormSchema, formValues);

  const resetSampling = () => {
    SAMPLING_FIELDS.forEach((k) =>
      form.setValue(k, null, { shouldDirty: true }),
    );
  };

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
                <span className="text-sm font-medium">
                  {t("RP.PRESET_TOKENIZER")}
                </span>
                <TokenizerSelect
                  value={form.watch("tokenizer") ?? ""}
                  onChange={(next) =>
                    form.setValue("tokenizer", next, { shouldDirty: true })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_TOKENIZER_HINT")}
                </p>
              </div>
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
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="autoScrollStream"
                  label={t("RP.PRESET_AUTO_SCROLL_STREAM")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_AUTO_SCROLL_STREAM_HINT")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <MyFormSwitch
                  control={form.control}
                  name="showReasoning"
                  label={t("RP.PRESET_SHOW_REASONING")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_SHOW_REASONING_HINT")}
                </p>
              </div>
              <div className="flex flex-col gap-3 border-t pt-3">
                <MyFormSwitch
                  control={form.control}
                  name="memoryEnabled"
                  label={t("RP.PRESET_MEMORY_ENABLED")}
                />
                <MyFormSwitch
                  control={form.control}
                  name="imageEnabled"
                  label={t("RP.PRESET_IMAGE_ENABLED")}
                />
                <UtilityModelField
                  control={form.control}
                  name="utilityModel"
                  groupName="utilityGroup"
                  labelKey="RP.PRESET_UTILITY_MODEL"
                  hintKey="RP.PRESET_UTILITY_MODEL_HINT"
                />
                <UtilityModelField
                  control={form.control}
                  name="titleModel"
                  groupName="titleGroup"
                  labelKey="RP.PRESET_TITLE_MODEL"
                  hintKey="RP.PRESET_TITLE_MODEL_HINT"
                />
                <MyFormTextarea
                  control={form.control}
                  name="titlePrompt"
                  schema={samplingPresetFormSchema}
                  label={t("RP.PRESET_TITLE_PROMPT")}
                />
                <MyFormSwitch
                  control={form.control}
                  name="imagePreview"
                  label={t("RP.PRESET_IMAGE_PREVIEW")}
                />
                <MyFormSwitch
                  control={form.control}
                  name="useCharAvatarRef"
                  label={t("RP.PRESET_USE_CHAR_AVATAR_REF")}
                />
                <ImageModelField
                  control={form.control}
                  name="imageModel"
                  groupName="imageGroup"
                  labelKey="RP.PRESET_IMAGE_MODEL"
                  hintKey="RP.PRESET_IMAGE_MODEL_HINT"
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t("RP.PRESET_IMAGE_PROMPT_INSTRUCTION")}
                    </label>
                    <Select
                      value=""
                      onValueChange={(id) => {
                        const tpl = IMAGE_STYLE_TEMPLATES.find(
                          (x) => x.id === id,
                        );
                        if (!tpl) return;
                        form.setValue("promptInstruction", tpl.instruction, {
                          shouldDirty: true,
                        });
                      }}
                    >
                      <SelectTrigger size="sm" className="h-7 w-36 text-xs">
                        <SelectValue
                          placeholder={t("CHAT.OVERRIDES.IMAGE_STYLE_TEMPLATE")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_STYLE_TEMPLATES.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {t(tpl.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <MyFormTextarea
                    control={form.control}
                    name="promptInstruction"
                    schema={samplingPresetFormSchema}
                  />
                </div>
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label>{t("RP.PRESET_POST_HISTORY")}</Label>
                <Select
                  value={form.watch("postHistoryRole")}
                  onValueChange={(v) =>
                    form.setValue("postHistoryRole", v as "system" | "user", {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger size="sm" className="h-7 w-28 text-xs">
                    <SelectValue>
                      {form.watch("postHistoryRole") === "user"
                        ? t("RP.LOREBOOK_ENTRY_INJECTION_ROLE_USER")
                        : t("RP.LOREBOOK_ENTRY_INJECTION_ROLE_SYSTEM")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      {t("RP.LOREBOOK_ENTRY_INJECTION_ROLE_SYSTEM")}
                    </SelectItem>
                    <SelectItem value="user">
                      {t("RP.LOREBOOK_ENTRY_INJECTION_ROLE_USER")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <MyFormTextarea
                control={form.control}
                name="postHistory"
                schema={samplingPresetFormSchema}
                rows={4}
                placeholder={t("RP.PRESET_POST_HISTORY_PLACEHOLDER")}
                description={t("RP.PRESET_POST_HISTORY_HINT")}
              />
            </div>
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
              <div className="flex flex-col gap-1">
                <MyFormTextarea
                  control={form.control}
                  name="continuePrompt"
                  label={t("RP.PRESET_CONTINUE_PROMPT")}
                  schema={samplingPresetFormSchema}
                />
                <p className="text-muted-foreground text-xs">
                  {t("RP.PRESET_CONTINUE_PROMPT_HINT")}
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
