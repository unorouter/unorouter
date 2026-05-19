"use client";

import { SortableList } from "@/components/elements/dnd/sortable-list";
import { SyncBadge } from "@/components/elements/badge/sync-badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuthQuery } from "@/hooks/auth-hook";
import { useCharactersQuery } from "@/hooks/rp/characters";
import {
  useChatBindingsQuery,
  useChatSettingsQuery,
  useUpdateChatBindingsMutation,
  useUpdateChatSettingsMutation,
} from "@/hooks/rp/conversations";
import { useLorebooksQuery } from "@/hooks/rp/lorebooks";
import { usePersonasQuery } from "@/hooks/rp/personas";
import { usePresetsQuery } from "@/hooks/rp/presets";
import { analytics } from "@/lib/analytics";
import { handleError } from "@/lib/utils/client";
import type { StreamOverrides } from "@/lib/validation/chat";
import { toast } from "sonner";
import {
  chatDefaultsAtom,
  chatModelAtom,
  samplerMemoryByModelAtom,
  type ModelSamplerMemory,
} from "@/store/chat-store";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { useAtom, useAtomValue } from "jotai";
import {
  conversationOverridesFormSchema,
  type ConversationOverridesForm,
} from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

import { MultiSelectPopover } from "../rp/multi-select-popover";
import { SamplingFields } from "../rp/sampling-fields";
import {
  resetSampling as resetSamplingHelper,
  SAMPLING_FIELDS,
  writeSamplerMemory,
} from "./conversation-overrides-form-handler";
import { Icon } from "@/components/ui/icon";

const REASONING_EFFORT_KEY = {
  minimal: "CHAT.OVERRIDES.EFFORT_MINIMAL",
  low: "CHAT.OVERRIDES.EFFORT_LOW",
  medium: "CHAT.OVERRIDES.EFFORT_MEDIUM",
  high: "CHAT.OVERRIDES.EFFORT_HIGH",
  xhigh: "CHAT.OVERRIDES.EFFORT_XHIGH",
} as const;

const WEB_SEARCH_ENGINE_KEY = {
  auto: "CHAT.OVERRIDES.ENGINE_AUTO",
  native: "CHAT.OVERRIDES.ENGINE_NATIVE",
  tavily: "CHAT.OVERRIDES.ENGINE_TAVILY",
  exa: "CHAT.OVERRIDES.ENGINE_EXA",
} as const;

const WEB_SEARCH_CONTEXT_KEY = {
  low: "CHAT.OVERRIDES.CONTEXT_LOW",
  medium: "CHAT.OVERRIDES.CONTEXT_MEDIUM",
  high: "CHAT.OVERRIDES.CONTEXT_HIGH",
} as const;

type DrawerProps = {
  convId: string | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ConversationOverridesDrawer(props: DrawerProps) {
  const t = useTranslations();
  const isLoggedIn = !!useAuthQuery().data;
  // Defaults mode edits jotai atom; server mode edits conversation_settings row (guests use userId=0).
  const isDefaultsMode = !props.convId;
  const showServerOnlyFields = isLoggedIn && !isDefaultsMode;
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

  // Per-model sampler memory layers over defaults: model switch restores that model's last sliders.
  useEffect(() => {
    if (isDefaultsMode) {
      const mem: ModelSamplerMemory = activeModelName
        ? (samplerMemoryByModel[activeModelName] ?? {})
        : {};
      form.reset({
        personaId: "__none__",
        presetId: "__none__",
        reasoningEffort:
          mem.reasoningEffort ?? chatDefaults.reasoningEffort ?? "__none__",
        chatMemory: chatDefaults.chatMemory ?? 8,
        authorNoteDepth: chatDefaults.authorNoteDepth ?? 4,
        systemPromptOverride: chatDefaults.systemPromptOverride ?? "",
        authorNote: chatDefaults.authorNote ?? "",
        webSearchEnabled: false,
        webSearchEngine: chatDefaults.webSearchEngine ?? "auto",
        webSearchContextSize: chatDefaults.webSearchContextSize ?? "medium",
        characterIds: [],
        lorebookIds: [],
        temperature: mem.temperature ?? chatDefaults.temperature ?? null,
        topP: mem.topP ?? chatDefaults.topP ?? null,
        topK: mem.topK ?? chatDefaults.topK ?? null,
        minP: mem.minP ?? chatDefaults.minP ?? null,
        topA: mem.topA ?? chatDefaults.topA ?? null,
        frequencyPenalty:
          mem.frequencyPenalty ?? chatDefaults.frequencyPenalty ?? null,
        presencePenalty:
          mem.presencePenalty ?? chatDefaults.presencePenalty ?? null,
        repetitionPenalty:
          mem.repetitionPenalty ?? chatDefaults.repetitionPenalty ?? null,
        maxTokens: mem.maxTokens ?? chatDefaults.maxTokens ?? null,
        extraBody: mem.extraBody ?? chatDefaults.extraBody ?? "",
        streamingEnabled: chatDefaults.streamingEnabled ?? true,
      });
      return;
    }
    if (!settings || !bindings) return;
    form.reset({
      personaId: settings.personaId ?? "__none__",
      presetId: settings.presetId ?? "__none__",
      reasoningEffort: settings.reasoningEffort ?? "__none__",
      chatMemory: settings.chatMemory ?? 8,
      authorNoteDepth: settings.authorNoteDepth ?? 4,
      systemPromptOverride: settings.systemPromptOverride ?? "",
      authorNote: settings.authorNote ?? "",
      webSearchEnabled: settings.webSearchEnabled ?? false,
      webSearchEngine: settings.webSearchEngine ?? "auto",
      webSearchContextSize: settings.webSearchContextSize ?? "medium",
      characterIds: bindings.characters.map((c) => c.characterId),
      lorebookIds: bindings.lorebooks.map((l) => l.lorebookId),
      temperature: settings.temperature ?? null,
      topP: settings.topP ?? null,
      topK: settings.topK ?? null,
      minP: settings.minP ?? null,
      topA: settings.topA ?? null,
      frequencyPenalty: settings.frequencyPenalty ?? null,
      presencePenalty: settings.presencePenalty ?? null,
      repetitionPenalty: settings.repetitionPenalty ?? null,
      maxTokens: settings.maxTokens ?? null,
      extraBody: settings.extraBody ?? "",
      streamingEnabled: settings.streamingEnabled ?? true,
    });
    // chatDefaults: pick up post-hydration value. activeModelName: restore per-model memory.
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

  const resetSampling = () => resetSamplingHelper(form);

  const onSubmit = async (data: ConversationOverridesForm) => {
    const dirtyFields = Object.keys(form.formState.dirtyFields);
    const samplingCustomized = SAMPLING_FIELDS.filter(
      (f) => data[f] !== null && data[f] !== undefined,
    );

    writeSamplerMemory(
      data,
      activeModelName,
      samplerMemoryByModel,
      setSamplerMemoryByModel,
    );
    analytics.chat.overridesSaved({
      mode: isDefaultsMode ? "defaults" : "conversation",
      changed_fields: dirtyFields,
      has_persona: data.personaId !== "__none__",
      has_preset: data.presetId !== "__none__",
      character_count: data.characterIds.length,
      lorebook_count: data.lorebookIds.length,
      has_system_prompt: !!data.systemPromptOverride,
      has_author_note: !!data.authorNote,
      reasoning_effort:
        data.reasoningEffort === "__none__" ? null : data.reasoningEffort,
      web_search_enabled: data.webSearchEnabled,
      web_search_engine: data.webSearchEnabled ? data.webSearchEngine : null,
      sampling_customized_fields: samplingCustomized,
    });

    if (isDefaultsMode) {
      // Persist to atom: seeds next conversation_settings row; server-only fields dropped for guests.
      const next: StreamOverrides = {
        reasoningEffort:
          data.reasoningEffort === "__none__"
            ? null
            : (data.reasoningEffort as StreamOverrides["reasoningEffort"]),
        chatMemory: data.chatMemory,
        systemPromptOverride: data.systemPromptOverride || null,
        authorNote: data.authorNote || null,
        authorNoteDepth: data.authorNoteDepth,
        temperature: data.temperature,
        topP: data.topP,
        topK: data.topK,
        minP: data.minP,
        topA: data.topA,
        frequencyPenalty: data.frequencyPenalty,
        presencePenalty: data.presencePenalty,
        repetitionPenalty: data.repetitionPenalty,
        maxTokens: data.maxTokens,
        extraBody: data.extraBody || null,
        streamingEnabled: data.streamingEnabled,
      };
      setChatDefaults(next);
      toast.success(t("COMMON.SAVED"));
      return;
    }
    try {
      await updateSettings.mutateAsync({
        convId: props.convId!,
        body: {
          chatMemory: data.chatMemory,
          authorNoteDepth: data.authorNoteDepth,
          systemPromptOverride: data.systemPromptOverride || null,
          authorNote: data.authorNote || null,
          personaId: data.personaId === "__none__" ? null : data.personaId,
          presetId: data.presetId === "__none__" ? null : data.presetId,
          reasoningEffort:
            data.reasoningEffort === "__none__"
              ? null
              : (data.reasoningEffort as
                  | "xhigh"
                  | "high"
                  | "medium"
                  | "low"
                  | "minimal"
                  | "none"),
          webSearchEnabled: data.webSearchEnabled,
          webSearchEngine: data.webSearchEngine as
            | "auto"
            | "native"
            | "exa"
            | "tavily",
          webSearchContextSize: data.webSearchContextSize as
            | "low"
            | "medium"
            | "high",
          temperature: data.temperature,
          topP: data.topP,
          topK: data.topK,
          minP: data.minP,
          topA: data.topA,
          frequencyPenalty: data.frequencyPenalty,
          presencePenalty: data.presencePenalty,
          repetitionPenalty: data.repetitionPenalty,
          maxTokens: data.maxTokens,
          extraBody: data.extraBody || null,
          streamingEnabled: data.streamingEnabled,
        },
      });
      await updateBindings.mutateAsync({
        convId: props.convId!,
        body: {
          characters: data.characterIds.map((id, i) => ({
            characterId: id,
            orderIndex: i,
            isActive: true,
          })),
          lorebookIds: data.lorebookIds,
        },
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
              {showServerOnlyFields && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="personaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("CHAT.OVERRIDES.PERSONA")}</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(v) =>
                              field.onChange(v ?? "__none__")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {field.value === "__none__"
                                  ? t("CHAT.OVERRIDES.NONE")
                                  : (personasQuery.data?.find(
                                      (p) => p.id === field.value,
                                    )?.name ?? t("CHAT.OVERRIDES.NONE"))}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                {t("CHAT.OVERRIDES.NONE")}
                              </SelectItem>
                              {personasQuery.data?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="presetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("CHAT.OVERRIDES.PRESET")}</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(v) =>
                              field.onChange(v ?? "__none__")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {field.value === "__none__"
                                  ? t("CHAT.OVERRIDES.NONE")
                                  : (presetsQuery.data?.find(
                                      (p) => p.id === field.value,
                                    )?.name ?? t("CHAT.OVERRIDES.NONE"))}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                {t("CHAT.OVERRIDES.NONE")}
                              </SelectItem>
                              {presetsQuery.data?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {showServerOnlyFields && (
                <FormField
                  control={form.control}
                  name="characterIds"
                  render={({ field }) => {
                    const ids = field.value as string[];
                    const lookup = new Map(
                      (charactersQuery.data ?? []).map((c) => [c.id, c.name]),
                    );
                    const orderedItems = ids
                      .map((id) => ({ id, name: lookup.get(id) ?? id }))
                      .filter((it) => lookup.has(it.id));
                    return (
                      <FormItem>
                        <FormLabel>{t("CHAT.OVERRIDES.CHARACTERS")}</FormLabel>
                        <FormControl>
                          <MultiSelectPopover
                            options={
                              charactersQuery.data?.map((c) => ({
                                id: c.id,
                                label: c.name,
                              })) ?? []
                            }
                            value={field.value}
                            onChange={field.onChange}
                            triggerLabel={t("CHAT.OVERRIDES.CHARACTERS")}
                            searchPlaceholder={t(
                              "CHAT.OVERRIDES.SEARCH_CHARACTERS",
                            )}
                            emptyText={t("CHAT.OVERRIDES.NO_CHARACTERS")}
                          />
                        </FormControl>
                        {orderedItems.length > 1 && (
                          <div className="mt-2">
                            <p className="text-muted-foreground mb-1 text-xs">
                              {t("CHAT.OVERRIDES.REORDER_HINT")}
                            </p>
                            <SortableList
                              items={orderedItems}
                              onReorder={(orderedIds) =>
                                field.onChange(orderedIds)
                              }
                              renderItem={(item, handle) => (
                                <div className="border-border/40 bg-card flex items-center gap-2 rounded-md border px-2 py-1.5">
                                  {handle}
                                  <span className="truncate text-sm">
                                    {item.name}
                                  </span>
                                </div>
                              )}
                            />
                          </div>
                        )}
                      </FormItem>
                    );
                  }}
                />
              )}

              {showServerOnlyFields && (
                <FormField
                  control={form.control}
                  name="lorebookIds"
                  render={({ field }) => {
                    const ids = field.value as string[];
                    const lookup = new Map(
                      (lorebooksQuery.data ?? []).map((l) => [l.id, l.name]),
                    );
                    const orderedItems = ids
                      .map((id) => ({ id, name: lookup.get(id) ?? id }))
                      .filter((it) => lookup.has(it.id));
                    return (
                      <FormItem>
                        <FormLabel>{t("CHAT.OVERRIDES.LOREBOOKS")}</FormLabel>
                        <FormControl>
                          <MultiSelectPopover
                            options={
                              lorebooksQuery.data?.map((l) => ({
                                id: l.id,
                                label: l.name,
                              })) ?? []
                            }
                            value={field.value}
                            onChange={field.onChange}
                            triggerLabel={t("CHAT.OVERRIDES.LOREBOOKS")}
                            searchPlaceholder={t(
                              "CHAT.OVERRIDES.SEARCH_LOREBOOKS",
                            )}
                            emptyText={t("CHAT.OVERRIDES.NO_LOREBOOKS")}
                          />
                        </FormControl>
                        {orderedItems.length > 1 && (
                          <div className="mt-2">
                            <p className="text-muted-foreground mb-1 text-xs">
                              {t("CHAT.OVERRIDES.REORDER_HINT")}
                            </p>
                            <SortableList
                              items={orderedItems}
                              onReorder={(orderedIds) =>
                                field.onChange(orderedIds)
                              }
                              renderItem={(item, handle) => (
                                <div className="border-border/40 bg-card flex items-center gap-2 rounded-md border px-2 py-1.5">
                                  {handle}
                                  <span className="truncate text-sm">
                                    {item.name}
                                  </span>
                                </div>
                              )}
                            />
                          </div>
                        )}
                      </FormItem>
                    );
                  }}
                />
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reasoningEffort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("CHAT.OVERRIDES.REASONING_EFFORT")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(v) => field.onChange(v ?? "__none__")}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {field.value === "__none__"
                                ? t("CHAT.OVERRIDES.MODEL_DEFAULT")
                                : field.value === "none"
                                  ? t("CHAT.OVERRIDES.OFF")
                                  : t(
                                      REASONING_EFFORT_KEY[
                                        field.value as keyof typeof REASONING_EFFORT_KEY
                                      ],
                                    )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              {t("CHAT.OVERRIDES.MODEL_DEFAULT")}
                            </SelectItem>
                            <SelectItem value="none">
                              {t("CHAT.OVERRIDES.OFF")}
                            </SelectItem>
                            {(
                              Object.keys(REASONING_EFFORT_KEY) as Array<
                                keyof typeof REASONING_EFFORT_KEY
                              >
                            ).map((k) => (
                              <SelectItem key={k} value={k}>
                                {t(REASONING_EFFORT_KEY[k])}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chatMemory"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>{t("CHAT.OVERRIDES.CHAT_MEMORY")}</FormLabel>
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
                <FormField
                  control={form.control}
                  name="streamingEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>
                          {t("CHAT.OVERRIDES.STREAMING_ENABLED")}
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {t("CHAT.OVERRIDES.STREAMING_ENABLED_HINT")}
                      </span>
                    </FormItem>
                  )}
                />
              </div>

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
                onReset={resetSampling}
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
                          placeholder={t(
                            "CHAT.OVERRIDES.EXTRA_BODY_PLACEHOLDER",
                          )}
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
                        placeholder={t(
                          "CHAT.OVERRIDES.SYSTEM_PROMPT_PLACEHOLDER",
                        )}
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
                          placeholder={t(
                            "CHAT.OVERRIDES.AUTHOR_NOTE_PLACEHOLDER",
                          )}
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

              {showServerOnlyFields && (
                <div className="flex flex-col gap-2 rounded-md border p-3">
                  <FormField
                    control={form.control}
                    name="webSearchEnabled"
                    render={({ field }) => (
                      <FormItem className="flex-row items-center justify-between">
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
                  {webSearchEnabled && (
                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="webSearchEngine"
                        render={({ field }) => (
                          <FormItem>
                            <Label className="text-muted-foreground text-xs">
                              {t("CHAT.OVERRIDES.WEB_SEARCH_ENGINE")}
                            </Label>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={(v) =>
                                  field.onChange(v ?? "auto")
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue>
                                    {t(
                                      WEB_SEARCH_ENGINE_KEY[
                                        field.value as keyof typeof WEB_SEARCH_ENGINE_KEY
                                      ],
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {(
                                    Object.keys(WEB_SEARCH_ENGINE_KEY) as Array<
                                      keyof typeof WEB_SEARCH_ENGINE_KEY
                                    >
                                  ).map((k) => (
                                    <SelectItem key={k} value={k}>
                                      {t(WEB_SEARCH_ENGINE_KEY[k])}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="webSearchContextSize"
                        render={({ field }) => (
                          <FormItem>
                            <Label className="text-muted-foreground text-xs">
                              {t("CHAT.OVERRIDES.WEB_SEARCH_CONTEXT_SIZE")}
                            </Label>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={(v) =>
                                  field.onChange(v ?? "medium")
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue>
                                    {t(
                                      WEB_SEARCH_CONTEXT_KEY[
                                        field.value as keyof typeof WEB_SEARCH_CONTEXT_KEY
                                      ],
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {(
                                    Object.keys(
                                      WEB_SEARCH_CONTEXT_KEY,
                                    ) as Array<
                                      keyof typeof WEB_SEARCH_CONTEXT_KEY
                                    >
                                  ).map((k) => (
                                    <SelectItem key={k} value={k}>
                                      {t(WEB_SEARCH_CONTEXT_KEY[k])}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
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
