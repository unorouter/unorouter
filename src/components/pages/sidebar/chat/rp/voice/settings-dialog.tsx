"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormKeyedSelect } from "@/components/elements/form/my-form-keyed-select";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { Button } from "@/components/ui/button";
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
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  useFishVoicesQuery,
  useSaveVoiceSettingsMutation,
  useVoiceSettingsQuery,
} from "@/hooks/ai/voice-hook";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import {
  speak,
  voicePlaybackAtom,
} from "@/components/pages/sidebar/chat/rp/voice/speak";
import { cn } from "@/lib/utils";
import { handleError } from "@/lib/utils/client";
import { dayjs } from "@/lib/utils/format/date";
import { formDefaults } from "@/lib/validation/helpers";
import {
  voiceSettingsForm,
  type VoiceSettingsForm,
} from "@/lib/validation/voice";
import { chatStore } from "@/store/chat-store";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import type { Control } from "react-hook-form";

const MODEL_KEYS = {
  "s2.1-pro-free": "CHAT.VOICE.MODEL_FREE",
  "s2.1-pro": "CHAT.VOICE.MODEL_PRO",
  s1: "CHAT.VOICE.MODEL_S1",
} as const;

const READ_MODE_KEYS = {
  all: "CHAT.VOICE.READ_ALL",
  dialogue: "CHAT.VOICE.READ_DIALOGUE",
  split: "CHAT.VOICE.READ_SPLIT",
} as const;

const TEST_KEY = "voice-settings-test";

export function VoiceSettingsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const settingsQuery = useVoiceSettingsQuery();
  const saveMut = useSaveVoiceSettingsMutation();
  const playing = useAtomValue(voicePlaybackAtom, { store: chatStore })?.key;
  const row = settingsQuery.data;
  const form = useRpForm(
    voiceSettingsForm,
    row
      ? formDefaults(voiceSettingsForm, {
          ...row,
          voiceId: row.voiceId ?? "",
          narratorVoiceId: row.narratorVoiceId ?? "",
        })
      : undefined,
  );
  const apiKey = form.watch("apiKey");

  const test = (values: VoiceSettingsForm) => {
    const now = dayjs().toDate();
    speak(
      TEST_KEY,
      {
        ...values,
        id: "test",
        voiceId: values.voiceId || null,
        narratorVoiceId: values.narratorVoiceId || null,
        createdAt: now,
        updatedAt: now,
      },
      t("CHAT.VOICE.TEST_TEXT"),
      null,
    ).catch((e) => handleError(e, t));
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col overflow-x-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("CHAT.VOICE.TITLE")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => saveMut.mutateAsync(v))}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1"
          >
            <p className="text-muted-foreground text-xs">
              {t("CHAT.VOICE.INTRO")}
            </p>
            <MyFormInput
              control={form.control}
              name="apiKey"
              schema={voiceSettingsForm}
              type="password"
              autoComplete="off"
              label={t("CHAT.VOICE.API_KEY")}
            />
            <p className="text-muted-foreground -mt-2 text-[11px]">
              {t("CHAT.VOICE.API_KEY_HINT")}
            </p>
            <MyFormKeyedSelect
              control={form.control}
              name="model"
              label={t("CHAT.VOICE.MODEL")}
              fallback="s2.1-pro-free"
              optionKeys={MODEL_KEYS}
            />
            <VoiceField
              control={form.control}
              name="voiceId"
              apiKey={apiKey}
              label={t("CHAT.VOICE.VOICE")}
              hint={t("CHAT.VOICE.VOICE_HINT")}
            />
            <MyFormKeyedSelect
              control={form.control}
              name="readMode"
              label={t("CHAT.VOICE.READ_MODE")}
              fallback="all"
              optionKeys={READ_MODE_KEYS}
            />
            {form.watch("readMode") === "split" && (
              <VoiceField
                control={form.control}
                name="narratorVoiceId"
                apiKey={apiKey}
                label={t("CHAT.VOICE.NARRATOR")}
                hint={t("CHAT.VOICE.NARRATOR_HINT")}
              />
            )}
            <SliderField
              control={form.control}
              name="speed"
              label={t("CHAT.VOICE.SPEED")}
              min={0.5}
              max={2}
              step={0.1}
              format={(v) => `${v.toFixed(1)}x`}
            />
            <SliderField
              control={form.control}
              name="volume"
              label={t("CHAT.VOICE.VOLUME")}
              min={-20}
              max={20}
              step={1}
              format={(v) => `${v > 0 ? "+" : ""}${v} dB`}
            />
            <MyFormSwitch
              control={form.control}
              name="autoplay"
              label={t("CHAT.VOICE.AUTOPLAY")}
              description={t("CHAT.VOICE.AUTOPLAY_HINT")}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!apiKey.trim()}
                onClick={form.handleSubmit(test)}
              >
                <Icon
                  name={playing === TEST_KEY ? "loader" : "volume-2"}
                  className={cn(
                    "mr-1.5 size-4",
                    playing === TEST_KEY && "animate-spin",
                  )}
                />
                {t("CHAT.VOICE.TEST")}
              </Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {t("COMMON.SAVE")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SliderField(props: {
  control: Control<VoiceSettingsForm>;
  name: "speed" | "volume";
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={(r) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>{props.label}</FormLabel>
            <span className="text-muted-foreground text-xs tabular-nums">
              {props.format(r.field.value)}
            </span>
          </div>
          <FormControl>
            <Slider
              min={props.min}
              max={props.max}
              step={props.step}
              value={[r.field.value]}
              onValueChange={(v) => {
                const n = Array.isArray(v) ? v[0] : v;
                if (typeof n === "number") r.field.onChange(n);
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function VoiceField(props: {
  control: Control<VoiceSettingsForm>;
  name: "voiceId" | "narratorVoiceId";
  apiKey: string;
  label: string;
  hint: string;
}) {
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={(r) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <p className="text-muted-foreground text-[11px]">{props.hint}</p>
          <VoicePicker
            value={r.field.value}
            onChange={r.field.onChange}
            apiKey={props.apiKey}
          />
        </FormItem>
      )}
    />
  );
}

export function VoicePicker(props: {
  value: string;
  onChange: (id: string) => void;
  apiKey: string;
}) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search);
  const voicesQuery = useFishVoicesQuery(query, props.apiKey);
  const voices = voicesQuery.data ?? [];
  return (
    <div className="flex flex-col gap-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("CHAT.VOICE.SEARCH_PLACEHOLDER")}
        disabled={!props.apiKey.trim()}
      />
      {props.apiKey.trim() && (
        <div className="border-border/40 flex max-h-40 flex-col overflow-y-auto rounded-md border">
          {voices.length === 0 && !voicesQuery.isFetching && (
            <div className="text-muted-foreground p-2 text-xs">
              {t("CHAT.VOICE.NO_VOICES")}
            </div>
          )}
          {voices.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => props.onChange(v.id === props.value ? "" : v.id)}
              className={cn(
                "hover:bg-accent flex flex-col items-start gap-0.5 px-2 py-1.5 text-left",
                v.id === props.value && "bg-accent",
              )}
            >
              <span className="text-sm">{v.title}</span>
              <span className="text-muted-foreground line-clamp-1 text-[11px]">
                {[...v.languages, ...v.tags.slice(0, 4)].join(", ")}
              </span>
            </button>
          ))}
        </div>
      )}
      <Input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.trim())}
        placeholder={t("CHAT.VOICE.VOICE_ID_PLACEHOLDER")}
        className="font-mono text-xs"
      />
    </div>
  );
}
