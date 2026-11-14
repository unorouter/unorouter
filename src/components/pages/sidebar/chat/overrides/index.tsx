"use client";

import { useMarkDirtyForm } from "@/hooks/ui/use-rp-form";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useChatBindingsQuery,
  useChatSettingsQuery,
  useUpdateChatBindingsMutation,
  useUpdateChatSettingsMutation,
} from "@/hooks/ai/rp/conversations";
import { usePresetsQuery } from "@/hooks/ai/rp/presets";
import { useModelDetailQuery } from "@/hooks/models/pricing-hook";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { NONE_VALUE } from "@/lib/config/constants";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { handleError } from "@/lib/utils/client";
import {
  conversationOverridesFormSchema,
  SAMPLING_FIELDS,
  type ConversationOverridesForm,
} from "@/lib/validation/rp-forms";
import {
  chatDefaultsAtom,
  chatLoadoutAtom,
  chatModelAtom,
  samplerMemoryByModelAtom,
} from "@/store/chat-store";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { SamplingFields } from "../rp/sampling-fields";
import {
  buildBindingsBody,
  buildDefaultsOverrides,
  buildSettingsBody,
  computeFormValues,
  resetSampling,
  writeSamplerMemory,
} from "./form-handler";
import { ImageRefsField } from "./image-refs-field";
import {
  OverridesBindingFields,
  OverridesGenerationFields,
  OverridesPromptFields,
} from "./override-fields";
import { formDefaults } from "@/lib/validation/helpers";

type DrawerProps = {
  convId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConversationOverridesDrawer(props: DrawerProps) {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const isDefaultsMode = !props.convId;
  const [chatDefaults, setChatDefaults] = useAtom(chatDefaultsAtom);
  const setLoadout = useSetAtom(chatLoadoutAtom);
  const [samplerMemoryByModel, setSamplerMemoryByModel] = useAtom(
    samplerMemoryByModelAtom,
  );
  const activeModelName = useAtomValue(chatModelAtom);
  const activeModel = useModelDetailQuery(activeModelName ?? null).data;
  const activeModelMetadata = activeModel?.metadata;
  const settingsQuery = useChatSettingsQuery(props.convId ?? undefined);
  const bindingsQuery = useChatBindingsQuery(props.convId ?? undefined);

  const updateSettings = useUpdateChatSettingsMutation();
  const updateBindings = useUpdateChatBindingsMutation();

  const settings = settingsQuery.data;
  const bindings = bindingsQuery.data;

  const presetsQuery = usePresetsQuery();
  const loadout = useAtomValue(chatLoadoutAtom);
  // Before the first send there is no settings row; the loadout is the only record.
  const effectivePresetId = settings?.presetId ?? loadout.presetId;
  const boundPreset =
    (effectivePresetId
      ? presetsQuery.data?.find((p) => p.id === effectivePresetId)
      : null) ?? null;

  const formValues = computeFormValues({
    isDefaultsMode,
    chatDefaults,
    activeModelName,
    samplerMemoryByModel,
    settings,
    bindings,
    preset: boundPreset,
  });

  const drawerState = JSON.stringify({
    convId: props.convId,
    settingsStatus: settingsQuery.status,
    settingsFound: !!settings,
    bindingsFound: !!bindings,
    presetId: settings?.presetId ?? null,
    presetsCount: presetsQuery.data?.length ?? null,
    boundPresetFound: !!boundPreset,
    standalone:
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)")?.matches ?? false),
    reasoningEffort: formValues?.reasoningEffort ?? null,
    showReasoning: formValues?.showReasoning ?? null,
    sampling: formValues
      ? Object.fromEntries(SAMPLING_FIELDS.map((f) => [f, formValues[f]]))
      : null,
  });
  const lastDrawerState = useRef("");
  useEffect(() => {
    if (!props.open || lastDrawerState.current === drawerState) return;
    lastDrawerState.current = drawerState;
    logChatDebug("settings.drawer_state", JSON.parse(drawerState));
  }, [props.open, drawerState]);

  const form = useForm({
    resolver: typeboxResolver(conversationOverridesFormSchema),
    defaultValues: formDefaults(conversationOverridesFormSchema),
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  });
  useMarkDirtyForm(form.formState.isDirty);

  const webSearchEnabled = useWatch({
    control: form.control,
    name: "webSearchEnabled",
  });

  const onSubmit = async (data: ConversationOverridesForm) => {
    logChatDebug("settings.saved", {
      convId: props.convId,
      isDefaultsMode,
      dirty: Object.keys(form.formState.dirtyFields),
      presetId: data.presetId === NONE_VALUE ? null : data.presetId,
      reasoningEffort:
        data.reasoningEffort === NONE_VALUE ? null : data.reasoningEffort,
      showReasoning: data.showReasoning ?? null,
      sampling: Object.fromEntries(SAMPLING_FIELDS.map((f) => [f, data[f]])),
    });
    writeSamplerMemory(
      data,
      activeModelName,
      samplerMemoryByModel,
      setSamplerMemoryByModel,
    );

    if (isDefaultsMode) {
      setChatDefaults(buildDefaultsOverrides(data));
      toast.success(t("COMMON.SAVED"));
      return;
    }
    try {
      await updateSettings.mutateAsync({
        convId: props.convId!,
        body: buildSettingsBody(data, boundPreset),
      });
      await updateBindings.mutateAsync({
        convId: props.convId!,
        body: buildBindingsBody(data, bindings),
      });
      setLoadout({
        presetId: data.presetId === NONE_VALUE ? null : data.presetId,
        personaId: data.personaId === NONE_VALUE ? null : data.personaId,
        characterIds: data.characterIds,
        lorebookIds: data.lorebookIds,
      });
      toast.success(t("COMMON.SAVED"));
    } catch (e) {
      handleError(e, t);
    }
  };

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="max-h-[90dvh] overflow-x-hidden overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>{t("CHAT.OVERRIDES.TITLE")}</SheetTitle>
          <SheetDescription>{t("CHAT.OVERRIDES.DESCRIPTION")}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex flex-col gap-5 px-4">
              {!isDefaultsMode && (
                <OverridesBindingFields control={form.control} />
              )}

              <OverridesGenerationFields
                control={form.control}
                webSearchEnabled={webSearchEnabled}
              />

              {!isDefaultsMode && <ImageRefsField convId={props.convId!} />}

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
                onReset={() => resetSampling(form)}
              />

              <OverridesPromptFields control={form.control} />
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
