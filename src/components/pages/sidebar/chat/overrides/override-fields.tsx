"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { MyFormCombobox } from "@/components/elements/form/my-form-combobox";
import { MyFormEntitySelect } from "@/components/elements/form/my-form-entity-select";
import { MyFormKeyedSelect } from "@/components/elements/form/my-form-keyed-select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InfoPopover,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import { useLorebooksQuery } from "@/hooks/ai/rp/lorebooks";
import { usePersonasQuery } from "@/hooks/ai/rp/personas";
import { usePresetsQuery } from "@/hooks/ai/rp/presets";
import { useCustomProvidersQuery } from "@/hooks/ai/custom-providers-hook";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { makeCustomModelId } from "@/lib/ai/chat/custom-provider-id";
import { IMAGE_STYLE_TEMPLATES } from "@/lib/ai/chat/image-style-templates";
import { DEFAULT_CHAT_MEMORY, msg, NONE_VALUE } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { parseExtraBody } from "@/lib/validation/chat";
import type { ConversationOverridesForm } from "@/lib/validation/rp-forms";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormContext, type Control } from "react-hook-form";
import {
  REASONING_EFFORT_KEY,
  WEB_SEARCH_CONTEXT_KEY,
  WEB_SEARCH_ENGINE_KEY,
} from "./form-handler";

// Per-conversation binding fields: persona, preset, characters, lorebooks. Conversation mode only; the drawer gates its render.
export function OverridesBindingFields(props: {
  control: Control<ConversationOverridesForm>;
}) {
  const t = useTranslations();
  const charactersQuery = useCharactersQuery();
  const personasQuery = usePersonasQuery();
  const lorebooksQuery = useLorebooksQuery();
  const presetsQuery = usePresetsQuery();

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MyFormEntitySelect
          control={props.control}
          name="personaId"
          label={t("CHAT.OVERRIDES.PERSONA")}
          noneLabel={t("CHAT.OVERRIDES.NONE")}
          options={personasQuery.data?.map((p) => ({
            id: p.id,
            // Display title distinguishes same-named personas; {{user}} still uses name.
            name: p.title ? `${p.title} (${p.name})` : p.name,
          }))}
        />
        <MyFormEntitySelect
          control={props.control}
          name="presetId"
          label={t("CHAT.OVERRIDES.PRESET")}
          noneLabel={t("CHAT.OVERRIDES.NONE")}
          options={presetsQuery.data}
        />
      </div>

      <MyFormCombobox
        control={props.control}
        name="characterIds"
        label={t("CHAT.OVERRIDES.CHARACTERS")}
        searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_CHARACTERS")}
        emptyText={t("CHAT.OVERRIDES.NO_CHARACTERS")}
        reorderHint={t("CHAT.OVERRIDES.REORDER_HINT")}
        options={charactersQuery.data}
      />

      <MyFormCombobox
        control={props.control}
        name="lorebookIds"
        label={t("CHAT.OVERRIDES.LOREBOOKS")}
        searchPlaceholder={t("CHAT.OVERRIDES.SEARCH_LOREBOOKS")}
        emptyText={t("CHAT.OVERRIDES.NO_LOREBOOKS")}
        reorderHint={t("CHAT.OVERRIDES.REORDER_HINT")}
        options={lorebooksQuery.data}
      />
    </>
  );
}

// Generation controls: reasoning effort, chat memory, streaming, web search.
export function OverridesGenerationFields(props: {
  control: Control<ConversationOverridesForm>;
  showConversationFields: boolean;
  webSearchEnabled: boolean;
}) {
  const t = useTranslations();

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MyFormKeyedSelect
          control={props.control}
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
          control={props.control}
          name="chatMemory"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FormLabel>{t("CHAT.OVERRIDES.CHAT_MEMORY")}</FormLabel>
                  <InfoPopover text={t("CHAT.OVERRIDES.CHAT_MEMORY_HINT")} />
                </div>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {field.value ?? t("CHAT.OVERRIDES.INHERIT")}
                </span>
              </div>
              <FormControl>
                <Slider
                  min={1}
                  max={DEFAULT_CHAT_MEMORY}
                  value={[field.value ?? DEFAULT_CHAT_MEMORY]}
                  onValueChange={(v) =>
                    field.onChange(Array.isArray(v) ? v[0] : v)
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border p-3">
        <FormField
          control={props.control}
          name="streamingEnabled"
          render={({ field }) => (
            <FormItem className="flex-row items-center gap-2">
              <FormLabel className="text-xs">
                {t("CHAT.OVERRIDES.STREAMING_ENABLED")}
              </FormLabel>
              <FormControl>
                <Switch
                  size="sm"
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={props.control}
          name="showReasoning"
          render={({ field }) => (
            <FormItem className="flex-row items-center gap-2">
              <FormLabel className="text-xs">
                {t("CHAT.OVERRIDES.SHOW_REASONING")}
              </FormLabel>
              <FormControl>
                <Switch
                  size="sm"
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {props.showConversationFields && (
          <>
            <FormField
              control={props.control}
              name="webSearchEnabled"
              render={({ field }) => (
                <FormItem className="flex-row items-center gap-2">
                  <FormLabel className="text-xs">
                    {t("CHAT.OVERRIDES.WEB_SEARCH")}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      size="sm"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={props.control}
              name="memoryEnabled"
              render={({ field }) => (
                <FormItem className="flex-row items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <FormLabel className="text-xs">
                      {t("CHAT.OVERRIDES.MEMORY_ENABLED")}
                    </FormLabel>
                    <InfoPopover
                      text={t("CHAT.OVERRIDES.MEMORY_ENABLED_HINT")}
                    />
                  </div>
                  <FormControl>
                    <Switch
                      size="sm"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}
      </div>

      {props.showConversationFields && props.webSearchEnabled && (
        <div className="grid grid-cols-2 gap-3">
          <MyFormKeyedSelect
            control={props.control}
            name="webSearchEngine"
            label={t("CHAT.OVERRIDES.WEB_SEARCH_ENGINE")}
            fallback="auto"
            optionKeys={WEB_SEARCH_ENGINE_KEY}
            labelClassName="text-muted-foreground text-xs"
          />
          <MyFormKeyedSelect
            control={props.control}
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

      {props.showConversationFields && (
        <div className="flex flex-col gap-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <FormField
              control={props.control}
              name="imageEnabled"
              render={({ field }) => (
                <FormItem className="flex-row items-center gap-2">
                  <FormLabel className="text-xs">
                    {t("CHAT.OVERRIDES.IMAGE_ENABLED")}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      size="sm"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={props.control}
              name="imagePreview"
              render={({ field }) => (
                <FormItem className="flex-row items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <FormLabel className="text-xs">
                      {t("CHAT.OVERRIDES.IMAGE_PREVIEW")}
                    </FormLabel>
                    <InfoPopover
                      text={t("CHAT.OVERRIDES.IMAGE_PREVIEW_HINT")}
                    />
                  </div>
                  <FormControl>
                    <Switch
                      size="sm"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={props.control}
              name="useCharAvatarRef"
              render={({ field }) => (
                <FormItem className="flex-row items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <FormLabel className="text-xs">
                      {t("CHAT.OVERRIDES.USE_CHAR_AVATAR_REF")}
                    </FormLabel>
                    <InfoPopover
                      text={t("CHAT.OVERRIDES.USE_CHAR_AVATAR_REF_HINT")}
                    />
                  </div>
                  <FormControl>
                    <Switch
                      size="sm"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <UtilityModelField control={props.control} />
          <ImageModelField control={props.control} />
          <ImagePromptInstructionField control={props.control} />
        </div>
      )}
    </>
  );
}

// Utility model picker: searchable catalog text models plus non-image custom-provider models
// (proxy/BYOK); the memory summarizer and image prompt-writer run on this model.
function UtilityModelField(props: {
  control: Control<ConversationOverridesForm>;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const pricing = usePricingQuery().data;
  const customProvidersQuery = useCustomProvidersQuery();
  const catalogModels = (pricing?.models ?? []).filter(
    (m) => m.type === "text",
  );
  const customOptions = (customProvidersQuery.data ?? []).flatMap((provider) =>
    provider.models
      .filter((m) => m.type !== "image")
      .map((m) => ({
        id: makeCustomModelId(provider.id, m.key),
        name: `${provider.name} / ${m.label}`,
      })),
  );
  return (
    <FormField
      control={props.control}
      name="utilityModel"
      render={({ field }) => {
        const customName = customOptions.find(
          (o) => o.id === field.value,
        )?.name;
        return (
          <FormItem>
            <FormLabel className="text-muted-foreground text-xs">
              {t("CHAT.OVERRIDES.UTILITY_MODEL")}
            </FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger className="border-input bg-background hover:bg-accent hover:text-accent-foreground flex h-8 w-full items-center justify-between rounded-md border px-3 text-xs">
                <span
                  className={cn(
                    "truncate",
                    field.value === NONE_VALUE
                      ? "text-muted-foreground"
                      : "font-mono",
                  )}
                >
                  {field.value === NONE_VALUE
                    ? t("CHAT.OVERRIDES.UTILITY_MODEL_PLACEHOLDER")
                    : (customName ?? field.value)}
                </span>
                <Icon
                  name="chevrons-up-down"
                  className="text-muted-foreground ml-2 h-3.5 w-3.5 shrink-0"
                />
              </PopoverTrigger>
              <PopoverContent
                className="w-[calc(100vw-1rem)] p-0 sm:w-96"
                align="start"
              >
                <Command>
                  <CommandInput
                    placeholder={t("CHAT.MODEL.SEARCH")}
                    className="h-8 text-xs"
                  />
                  <CommandList>
                    <CommandEmpty>{t("CHAT.MODEL.NO_RESULTS")}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value={NONE_VALUE}
                        onSelect={() => {
                          field.onChange(NONE_VALUE);
                          setOpen(false);
                        }}
                        className="text-xs"
                      >
                        {t("CHAT.OVERRIDES.UTILITY_MODEL_PLACEHOLDER")}
                      </CommandItem>
                    </CommandGroup>
                    {customOptions.length > 0 && (
                      <CommandGroup heading={t("CHAT.MODEL.CUSTOM_PROVIDERS")}>
                        {customOptions.map((o) => (
                          <CommandItem
                            key={o.id}
                            value={o.id}
                            keywords={[o.name]}
                            onSelect={() => {
                              field.onChange(o.id);
                              setOpen(false);
                            }}
                            className="text-xs"
                          >
                            <Icon
                              name="server"
                              className="h-3.5 w-3.5 shrink-0"
                            />
                            <span className="min-w-0 flex-1 truncate font-mono">
                              {o.name}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    <CommandGroup>
                      {catalogModels.map((m) => (
                        <CommandItem
                          key={m.name}
                          value={m.name}
                          keywords={[
                            m.vendor.name,
                            ...(m.isFree ? ["free"] : []),
                          ]}
                          onSelect={() => {
                            field.onChange(m.name);
                            setOpen(false);
                          }}
                          className="text-xs"
                        >
                          <VendorIcon vendor={m.vendor.name} size={14} />
                          <span className="min-w-0 flex-1 truncate font-mono">
                            {m.name}
                          </span>
                          {m.isFree && (
                            <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] leading-none font-medium text-emerald-700 dark:text-emerald-300">
                              {t("CHAT.MODEL.FREE_BADGE")}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormItem>
        );
      }}
    />
  );
}

// Image model picker: catalog image models (labeled with their reference-image capacity) plus
// image-typed custom-provider models (BYOK; generated browser-direct against the user's endpoint).
function ImageModelField(props: {
  control: Control<ConversationOverridesForm>;
}) {
  const t = useTranslations();
  const pricing = usePricingQuery().data;
  const customProvidersQuery = useCustomProvidersQuery();
  const catalogOptions = (pricing?.models ?? [])
    .filter((m) => m.type === "image")
    .map((m) => ({
      id: m.name,
      name: m.metadata.maxImageInputs
        ? `${m.name} (${t("CHAT.OVERRIDES.IMAGE_MODEL_REFS", { count: m.metadata.maxImageInputs })})`
        : m.name,
    }));
  const customOptions = (customProvidersQuery.data ?? []).flatMap((provider) =>
    provider.models
      .filter((m) => m.type === "image")
      .map((m) => ({
        id: makeCustomModelId(provider.id, m.key),
        name: `${provider.name} / ${m.label}`,
      })),
  );
  return (
    <MyFormEntitySelect
      control={props.control}
      name="imageModel"
      label={t("CHAT.OVERRIDES.IMAGE_MODEL")}
      noneLabel={t("CHAT.OVERRIDES.IMAGE_MODEL_AUTO")}
      options={[...customOptions, ...catalogOptions]}
    />
  );
}

// Prompt-writer instruction textarea plus a style-template select that fills it (user edits from there).
function ImagePromptInstructionField(props: {
  control: Control<ConversationOverridesForm>;
}) {
  const t = useTranslations();
  const form = useFormContext<ConversationOverridesForm>();
  return (
    <FormField
      control={props.control}
      name="promptInstruction"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel className="text-muted-foreground text-xs">
              {t("CHAT.OVERRIDES.IMAGE_PROMPT_INSTRUCTION")}
            </FormLabel>
            <Select
              value=""
              onValueChange={(id) => {
                const tpl = IMAGE_STYLE_TEMPLATES.find((x) => x.id === id);
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
          <FormControl>
            <Textarea
              className="min-h-16 text-xs"
              placeholder={t(
                "CHAT.OVERRIDES.IMAGE_PROMPT_INSTRUCTION_PLACEHOLDER",
              )}
              value={field.value}
              onChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

// Free-text prompt fields: extra body JSON, system prompt, author note + depth.
export function OverridesPromptFields(props: {
  control: Control<ConversationOverridesForm>;
}) {
  const t = useTranslations();

  return (
    <>
      <FormField
        control={props.control}
        name="extraBody"
        render={({ field }) => {
          const invalid = parseExtraBody(field.value).state === "invalid";
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
        control={props.control}
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
          control={props.control}
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
          control={props.control}
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
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  className="w-20"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
