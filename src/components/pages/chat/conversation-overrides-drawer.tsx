"use client";

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
import {
  useChatBindingsQuery,
  useChatSettingsQuery,
  useCharactersQuery,
  useLorebooksQuery,
  usePersonasQuery,
  usePresetsQuery,
  useUpdateChatBindingsMutation,
  useUpdateChatSettingsMutation,
} from "@/hooks/rp-hook";
import type { StreamOverrides } from "@/lib/validation/chat";
import { chatDefaultsAtom } from "@/store/chat-store";
import { useAtom } from "jotai";
import {
  conversationOverridesFormSchema,
  type ConversationOverridesForm,
} from "@/lib/validation/rp-forms";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { LuSettings2 } from "react-icons/lu";
import { MultiSelectPopover } from "./multi-select-popover";
import { SamplingFields } from "./sampling-fields";

type DrawerProps = {
  /** null when no conversation exists yet (fresh thread, or guest pre-create). */
  convId: string | null;
  trigger?: React.ReactElement;
};

export function ConversationOverridesDrawer(props: DrawerProps) {
  const t = useTranslations();
  const isLoggedIn = !!useAuthQuery().data;
  // Defaults mode: edits the jotai atom (used for next-chat seeding + as the
  // server-side fallback for guest convs). Server mode: edits the
  // conversation_settings row for the active convId.
  const isDefaultsMode = !isLoggedIn || !props.convId;
  const [chatDefaults, setChatDefaults] = useAtom(chatDefaultsAtom);
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

  // Seed form. In defaults mode read from the jotai atom; otherwise from the
  // server settings + bindings as soon as they're loaded.
  useEffect(() => {
    if (isDefaultsMode) {
      form.reset({
        personaId: "__none__",
        presetId: "__none__",
        reasoningEffort: chatDefaults.reasoningEffort ?? "__none__",
        chatMemory: chatDefaults.chatMemory ?? 8,
        authorNoteDepth: chatDefaults.authorNoteDepth ?? 4,
        systemPromptOverride: chatDefaults.systemPromptOverride ?? "",
        authorNote: chatDefaults.authorNote ?? "",
        webSearchEnabled: false,
        webSearchEngine: chatDefaults.webSearchEngine ?? "auto",
        webSearchContextSize: chatDefaults.webSearchContextSize ?? "medium",
        characterIds: [],
        lorebookIds: [],
        temperature: chatDefaults.temperature ?? null,
        topP: chatDefaults.topP ?? null,
        topK: chatDefaults.topK ?? null,
        minP: chatDefaults.minP ?? null,
        topA: chatDefaults.topA ?? null,
        frequencyPenalty: chatDefaults.frequencyPenalty ?? null,
        presencePenalty: chatDefaults.presencePenalty ?? null,
        repetitionPenalty: chatDefaults.repetitionPenalty ?? null,
        maxTokens: chatDefaults.maxTokens ?? null,
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
    });
    // Re-seed only when convId or the underlying server data changes;
    // form.reset is stable. `chatDefaults` is included so the form picks up
    // the value once `atomWithStorage` hydrates from the cookie on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.convId, settings, bindings, isDefaultsMode, chatDefaults]);

  const webSearchEnabled = useWatch({
    control: form.control,
    name: "webSearchEnabled",
  });

  const resetSampling = () => {
    form.setValue("temperature", null, { shouldDirty: true });
    form.setValue("topP", null, { shouldDirty: true });
    form.setValue("topK", null, { shouldDirty: true });
    form.setValue("minP", null, { shouldDirty: true });
    form.setValue("topA", null, { shouldDirty: true });
    form.setValue("frequencyPenalty", null, { shouldDirty: true });
    form.setValue("presencePenalty", null, { shouldDirty: true });
    form.setValue("repetitionPenalty", null, { shouldDirty: true });
    form.setValue("maxTokens", null, { shouldDirty: true });
  };

  const onSubmit = async (data: ConversationOverridesForm) => {
    if (isDefaultsMode) {
      // Persist to the jotai atom so it survives across new chats and seeds
      // the next conversation_settings row at create time. Drop server-only
      // fields (persona/preset/characters/lorebooks/system prompt/author note/
      // web search) — guests don't have those.
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
      };
      setChatDefaults(next);
      return;
    }
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
  };

  return (
    <Sheet>
      <SheetTrigger
        render={
          props.trigger ?? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("CHAT.OVERRIDES.OPEN")}
            >
              <LuSettings2 className="size-4" />
            </Button>
          )
        }
      />
      <SheetContent className="overflow-y-auto overflow-x-hidden sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("CHAT.OVERRIDES.TITLE")}</SheetTitle>
          <SheetDescription>
            {t("CHAT.OVERRIDES.DESCRIPTION")}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex flex-col gap-5 px-4">
              {!isDefaultsMode && (
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
                                : personasQuery.data?.find(
                                    (p) => p.id === field.value,
                                  )?.name ?? t("CHAT.OVERRIDES.NONE")}
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
                                : presetsQuery.data?.find(
                                    (p) => p.id === field.value,
                                  )?.name ?? t("CHAT.OVERRIDES.NONE")}
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

              {!isDefaultsMode && (
              <FormField
                control={form.control}
                name="characterIds"
                render={({ field }) => (
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
                  </FormItem>
                )}
              />
              )}

              {!isDefaultsMode && (
              <FormField
                control={form.control}
                name="lorebookIds"
                render={({ field }) => (
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
                  </FormItem>
                )}
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
                          onValueChange={(v) =>
                            field.onChange(v ?? "__none__")
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {field.value === "__none__"
                                ? t("CHAT.OVERRIDES.MODEL_DEFAULT")
                                : field.value === "none"
                                  ? t("CHAT.OVERRIDES.OFF")
                                  : field.value.charAt(0).toUpperCase() +
                                    field.value.slice(1)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              {t("CHAT.OVERRIDES.MODEL_DEFAULT")}
                            </SelectItem>
                            <SelectItem value="none">
                              {t("CHAT.OVERRIDES.OFF")}
                            </SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="xhigh">XHigh</SelectItem>
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
                onReset={resetSampling}
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

              {!isDefaultsMode && (
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
                                  {field.value.charAt(0).toUpperCase() +
                                    field.value.slice(1)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="native">Native</SelectItem>
                                <SelectItem value="tavily">Tavily</SelectItem>
                                <SelectItem value="exa">Exa</SelectItem>
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
                                  {field.value.charAt(0).toUpperCase() +
                                    field.value.slice(1)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
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
