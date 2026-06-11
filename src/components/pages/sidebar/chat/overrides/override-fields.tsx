"use client";

import { MyFormCombobox } from "@/components/elements/form/my-form-combobox";
import { MyFormEntitySelect } from "@/components/elements/form/my-form-entity-select";
import { MyFormKeyedSelect } from "@/components/elements/form/my-form-keyed-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoPopover } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import { useLorebooksQuery } from "@/hooks/ai/rp/lorebooks";
import { usePersonasQuery } from "@/hooks/ai/rp/personas";
import { usePresetsQuery } from "@/hooks/ai/rp/presets";
import { msg, NONE_VALUE } from "@/lib/config/constants";
import { parseExtraBody } from "@/lib/validation/chat";
import type { ConversationOverridesForm } from "@/lib/validation/rp-forms";
import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import {
  REASONING_EFFORT_KEY,
  WEB_SEARCH_CONTEXT_KEY,
  WEB_SEARCH_ENGINE_KEY,
} from "./form-handler";

// Per-conversation binding fields: persona, preset, characters, lorebooks.
// Conversation mode only; the drawer gates its render.
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MyFormEntitySelect
          control={props.control}
          name="personaId"
          label={t("CHAT.OVERRIDES.PERSONA")}
          noneLabel={t("CHAT.OVERRIDES.NONE")}
          options={personasQuery.data}
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
                  max={200}
                  value={[field.value ?? 8]}
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
          control={props.control}
          name="streamingEnabled"
          render={({ field }) => (
            <FormItem className="flex-row items-center justify-between rounded-md border p-3">
              <FormLabel>{t("CHAT.OVERRIDES.STREAMING_ENABLED")}</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {props.showConversationFields && (
          <FormField
            control={props.control}
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

      {props.showConversationFields && props.webSearchEnabled && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
    </>
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
