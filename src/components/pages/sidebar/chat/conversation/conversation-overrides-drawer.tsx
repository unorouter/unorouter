"use client";

import { SyncBadge } from "@/components/elements/badge/sync-badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import {
  useChatBindingsQuery,
  useChatSettingsQuery,
  useUpdateChatBindingsMutation,
  useUpdateChatSettingsMutation,
} from "@/hooks/ai/rp/conversations";
import { useLorebooksQuery } from "@/hooks/ai/rp/lorebooks";
import { usePersonasQuery } from "@/hooks/ai/rp/personas";
import { usePresetsQuery } from "@/hooks/ai/rp/presets";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { analytics } from "@/lib/analytics";
import { msg, NONE_VALUE } from "@/lib/config/constants";
import { handleError } from "@/lib/utils/client";
import {
  conversationOverridesFormSchema,
  SAMPLING_FIELDS,
  type ConversationOverridesForm,
} from "@/lib/validation/rp-forms";
import {
  chatDefaultsAtom,
  chatModelAtom,
  samplerMemoryByModelAtom,
} from "@/store/chat-store";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useAtom, useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { SamplingFields } from "../rp/sampling-fields";
import {
  BindingMultiSelect,
  EntitySelect,
  KeyedSelect,
} from "./conversation-overrides-fields";
import {
  buildBindingsBody,
  buildDefaultsForm,
  buildDefaultsOverrides,
  buildSettingsBody,
  buildSettingsForm,
  resetSampling as resetSamplingHelper,
  writeSamplerMemory,
} from "./conversation-overrides-form-handler";

const REASONING_EFFORT_KEY = {
  minimal: msg("CHAT.OVERRIDES.EFFORT_MINIMAL"),
  low: msg("CHAT.OVERRIDES.EFFORT_LOW"),
  medium: msg("CHAT.OVERRIDES.EFFORT_MEDIUM"),
  high: msg("CHAT.OVERRIDES.EFFORT_HIGH"),
  xhigh: msg("CHAT.OVERRIDES.EFFORT_XHIGH"),
} as const;

const WEB_SEARCH_ENGINE_KEY = {
  auto: msg("CHAT.OVERRIDES.ENGINE_AUTO"),
  native: msg("CHAT.OVERRIDES.ENGINE_NATIVE"),
  tavily: msg("CHAT.OVERRIDES.ENGINE_TAVILY"),
  exa: msg("CHAT.OVERRIDES.ENGINE_EXA"),
} as const;

const WEB_SEARCH_CONTEXT_KEY = {
  low: msg("CHAT.OVERRIDES.CONTEXT_LOW"),
  medium: msg("CHAT.OVERRIDES.CONTEXT_MEDIUM"),
  high: msg("CHAT.OVERRIDES.CONTEXT_HIGH"),
} as const;

type DrawerProps = {
  convId: string | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function InfoPopover(props: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label={props.text}
          >
            <Icon name="info" className="size-3.5" />
          </button>
        }
      />
      <PopoverContent className="text-muted-foreground max-w-xs text-xs">
        {props.text}
      </PopoverContent>
    </Popover>
  );
}

export function ConversationOverridesDrawer(props: DrawerProps) {
  const t = useTranslations();
  // Defaults mode edits the jotai atom; conversation mode edits the
  // conversation_settings row. Both work offline for guests via SQLocal.
  // Per-conversation fields (binding, web search) show in conversation mode.
  const isDefaultsMode = !props.convId;
  const showConversationFields = !isDefaultsMode;
  const [chatDefaults, setChatDefaults] = useAtom(chatDefaultsAtom);
  const [samplerMemoryByModel, setSamplerMemoryByModel] = useAtom(
    samplerMemoryByModelAtom,
  );
  const activeModelName = useAtomValue(chatModelAtom);
  const pricing = usePricingQuery().data;
  const activeModelMetadata = activeModelName
    ? pricing?.models.find((m) => m.name === activeModelName)?.metadata
    : undefined;
  const settingsQuery = useChatSettingsQuery(
    !isDefaultsMode ? props.convId! : undefined,
  );
  const bindingsQuery = useChatBindingsQuery(
    !isDefaultsMode ? props.convId! : undefined,
  );
  const charactersQuery = useCharactersQuery();
  const personasQuery = usePersonasQuery();
  const lorebooksQuery = useLorebooksQuery();
  const presetsQuery = usePresetsQuery();

  const updateSettings = useUpdateChatSettingsMutation();
  const updateBindings = useUpdateChatBindingsMutation();

  const settings = settingsQuery.data;
  const bindings = bindingsQuery.data;

  const form = useForm({
    resolver: typeboxResolver(conversationOverridesFormSchema),
    defaultValues: Value.Default(
      conversationOverridesFormSchema,
      {},
    ) as ConversationOverridesForm,
  });

  // Per-model sampler memory layers over defaults: model switch restores that
  // model's last sliders.
  useEffect(() => {
    if (isDefaultsMode) {
      const memory = activeModelName
        ? (samplerMemoryByModel[activeModelName] ?? {})
        : {};
      form.reset(buildDefaultsForm(chatDefaults, memory));
      return;
    }
    if (!settings || !bindings) return;
    form.reset(buildSettingsForm(settings, bindings));
    // chatDefaults: pick up post-hydration value. activeModelName: restore
    // per-model memory.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.convId,
    settings,
    bindings,
    isDefaultsMode,
    chatDefaults,
    activeModelName,
    samplerMemoryByModel,
  ]);

  const webSearchEnabled = useWatch({
    control: form.control,
    name: "webSearchEnabled",
  });

  const onSubmit = async (data: ConversationOverridesForm) => {
    writeSamplerMemory(
      data,
      activeModelName,
      samplerMemoryByModel,
      setSamplerMemoryByModel,
    );
    analytics.chat.overridesSaved({
      mode: isDefaultsMode ? "defaults" : "conversation",
      changed_fields: Object.keys(form.formState.dirtyFields),
      has_persona: data.personaId !== NONE_VALUE,
      has_preset: data.presetId !== NONE_VALUE,
      character_count: data.characterIds.length,
      lorebook_count: data.lorebookIds.length,
      has_system_prompt: !!data.systemPromptOverride,
      has_author_note: !!data.authorNote,
      reasoning_effort:
        data.reasoningEffort === NONE_VALUE ? null : data.reasoningEffort,
      web_search_enabled: data.webSearchEnabled,
      web_search_engine: data.webSearchEnabled ? data.webSearchEngine : null,
      sampling_customized_fields: SAMPLING_FIELDS.filter(
        (f) => data[f] !== null && data[f] !== undefined,
      ),
    });

    if (isDefaultsMode) {
      // Persist to the atom: seeds the next conversation_settings row.
      setChatDefaults(buildDefaultsOverrides(data));
      toast.success(t("COMMON.SAVED"));
      return;
    }
    try {
      await updateSettings.mutateAsync({
        convId: props.convId!,
        body: buildSettingsBody(data),
      });
      await updateBindings.mutateAsync({
        convId: props.convId!,
        body: buildBindingsBody(data),
      });
      toast.success(t("COMMON.SAVED"));
    } catch (e) {
      handleError(e, t);
    }
  };

  const controlled = props.open !== undefined;

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      {!controlled && (
        <SheetTrigger
          onClick={() =>
            analytics.chat.overridesDrawerOpened({
              mode: isDefaultsMode ? "defaults" : "conversation",
            })
          }
          render={
            props.trigger ?? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("CHAT.OVERRIDES.OPEN")}
              >
                <Icon name="settings-2" className="size-4" />
              </Button>
            )
          }
        />
      )}
      <SheetContent className="overflow-x-hidden overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("CHAT.OVERRIDES.TITLE")}</SheetTitle>
          <SheetDescription>{t("CHAT.OVERRIDES.DESCRIPTION")}</SheetDescription>
          {props.convId && <SyncBadge kind="conversations" id={props.convId} />}
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex flex-col gap-5 px-4">
              {showConversationFields && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <EntitySelect
                    control={form.control}
                    name="personaId"
                    label={t("CHAT.OVERRIDES.PERSONA")}
                    options={personasQuery.data}
                  />
                  <EntitySelect
                    control={form.control}
                    name="presetId"
                    label={t("CHAT.OVERRIDES.PRESET")}
                    options={presetsQuery.data}
                  />
                </div>
              )}

              {showConversationFields && (
                <BindingMultiSelect
                  control={form.control}
                  name="characterIds"
                  label={t("CHAT.OVERRIDES.CHARACTERS")}
                  searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_CHARACTERS")}
                  emptyText={t("CHAT.OVERRIDES.NO_CHARACTERS")}
                  options={charactersQuery.data}
                />
              )}

              {showConversationFields && (
                <BindingMultiSelect
                  control={form.control}
                  name="lorebookIds"
                  label={t("CHAT.OVERRIDES.LOREBOOKS")}
                  searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_LOREBOOKS")}
                  emptyText={t("CHAT.OVERRIDES.NO_LOREBOOKS")}
                  options={lorebooksQuery.data}
                />
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <KeyedSelect
                  control={form.control}
                  name="reasoningEffort"
                  label={t("CHAT.OVERRIDES.REASONING_EFFORT")}
                  fallback={NONE_VALUE}
                  optionKeys={REASONING_EFFORT_KEY}
                  leadingOptions={[
                    {
                      value: NONE_VALUE,
                      labelKey: msg("CHAT.OVERRIDES.MODEL_DEFAULT"),
                    },
                    { value: "none", labelKey: msg("CHAT.OVERRIDES.OFF") },
                  ]}
                />
                <FormField
                  control={form.control}
                  name="chatMemory"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <FormLabel>
                            {t("CHAT.OVERRIDES.CHAT_MEMORY")}
                          </FormLabel>
                          <InfoPopover
                            text={t("CHAT.OVERRIDES.CHAT_MEMORY_HINT")}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {field.value}
                        </span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={200}
                          value={[field.value]}
                          onValueChange={(v) =>
                            field.onChange(Array.isArray(v) ? v[0] : v)
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="streamingEnabled"
                  render={({ field }) => (
                    <FormItem className="flex-row items-center justify-between rounded-md border p-3">
                      <FormLabel>
                        {t("CHAT.OVERRIDES.STREAMING_ENABLED")}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {showConversationFields && (
                  <FormField
                    control={form.control}
                    name="webSearchEnabled"
                    render={({ field }) => (
                      <FormItem className="flex-row items-center justify-between rounded-md border p-3">
                        <FormLabel>{t("CHAT.OVERRIDES.WEB_SEARCH")}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {showConversationFields && webSearchEnabled && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <KeyedSelect
                    control={form.control}
                    name="webSearchEngine"
                    label={t("CHAT.OVERRIDES.WEB_SEARCH_ENGINE")}
                    fallback="auto"
                    optionKeys={WEB_SEARCH_ENGINE_KEY}
                    labelClassName="text-muted-foreground text-xs"
                  />
                  <KeyedSelect
                    control={form.control}
                    name="webSearchContextSize"
                    label={t("CHAT.OVERRIDES.WEB_SEARCH_CONTEXT_SIZE")}
                    fallback="medium"
                    optionKeys={WEB_SEARCH_CONTEXT_KEY}
                    labelClassName="text-muted-foreground text-xs"
                  />
                </div>
              )}

              <span className="text-muted-foreground text-xs">
                {t("CHAT.OVERRIDES.STREAMING_ENABLED_HINT")}
              </span>

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
                metadata={activeModelMetadata}
                onReset={() => resetSamplingHelper(form)}
              />

              <FormField
                control={form.control}
                name="extraBody"
                render={({ field }) => {
                  const value = field.value as string;
                  let invalid = false;
                  if (value && value.trim().length > 0) {
                    try {
                      const parsed = JSON.parse(value);
                      invalid = !parsed || typeof parsed !== "object";
                    } catch {
                      invalid = true;
                    }
                  }
                  return (
                    <FormItem>
                      <FormLabel>{t("CHAT.OVERRIDES.EXTRA_BODY")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t("CHAT.OVERRIDES.EXTRA_BODY_PLACEHOLDER")}
                          rows={4}
                          className={
                            invalid
                              ? "border-destructive focus-visible:ring-destructive font-mono text-xs"
                              : "font-mono text-xs"
                          }
                        />
                      </FormControl>
                      <p className="text-muted-foreground text-xs">
                        {invalid
                          ? t("CHAT.OVERRIDES.EXTRA_BODY_INVALID")
                          : t("CHAT.OVERRIDES.EXTRA_BODY_HINT")}
                      </p>
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="systemPromptOverride"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("CHAT.OVERRIDES.SYSTEM_PROMPT")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("CHAT.OVERRIDES.SYSTEM_PROMPT_PLACEHOLDER")}
                        rows={4}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="authorNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("CHAT.OVERRIDES.AUTHOR_NOTE")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t("CHAT.OVERRIDES.AUTHOR_NOTE_PLACEHOLDER")}
                          rows={3}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="authorNoteDepth"
                  render={({ field }) => (
                    <FormItem className="flex-row items-center justify-between">
                      <Label className="text-muted-foreground text-xs">
                        {t("CHAT.OVERRIDES.AUTHOR_NOTE_DEPTH")}
                      </Label>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <SheetFooter>
              <Button
                type="submit"
                disabled={updateSettings.isPending || updateBindings.isPending}
              >
                {t("COMMON.SAVE")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
