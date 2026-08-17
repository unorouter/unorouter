"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
import { analytics } from "@/lib/analytics";
import { FREE_MODEL_OUTPUT_CAP, NONE_VALUE } from "@/lib/config/constants";
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
import { Value } from "@sinclair/typebox/value";
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

type DrawerProps = {
  convId: string | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ConversationOverridesDrawer(props: DrawerProps) {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const isDefaultsMode = !props.convId;
  const showConversationFields = !isDefaultsMode;
  const [chatDefaults, setChatDefaults] = useAtom(chatDefaultsAtom);
  const setLoadout = useSetAtom(chatLoadoutAtom);
  const [samplerMemoryByModel, setSamplerMemoryByModel] = useAtom(
    samplerMemoryByModelAtom,
  );
  const activeModelName = useAtomValue(chatModelAtom);
  const activeModel = useModelDetailQuery(activeModelName ?? null).data;
  const activeModelMetadata = activeModel?.metadata;
  const maxTokensCap = activeModel
    ? activeModel.is_free
      ? FREE_MODEL_OUTPUT_CAP
      : activeModelMetadata?.maxOutputTokens
    : undefined;
  const settingsQuery = useChatSettingsQuery(
    !isDefaultsMode ? props.convId! : undefined,
  );
  const bindingsQuery = useChatBindingsQuery(
    !isDefaultsMode ? props.convId! : undefined,
  );

  const updateSettings = useUpdateChatSettingsMutation();
  const updateBindings = useUpdateChatBindingsMutation();

  const settings = settingsQuery.data;
  const bindings = bindingsQuery.data;

  const presetsQuery = usePresetsQuery();
  const boundPreset =
    (settings?.presetId
      ? presetsQuery.data?.find((p) => p.id === settings.presetId)
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
    if (props.open === false || lastDrawerState.current === drawerState) return;
    lastDrawerState.current = drawerState;
    logChatDebug("settings.drawer_state", JSON.parse(drawerState));
  }, [props.open, drawerState]);

  const form = useForm({
    resolver: typeboxResolver(conversationOverridesFormSchema),
    defaultValues: Value.Default(
      conversationOverridesFormSchema,
      {},
    ) as ConversationOverridesForm,
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  });

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
              {showConversationFields && (
                <OverridesBindingFields control={form.control} />
              )}

              <OverridesGenerationFields
                control={form.control}
                showConversationFields={showConversationFields}
                webSearchEnabled={webSearchEnabled}
              />

              {showConversationFields && (
                <ImageRefsField convId={props.convId!} />
              )}

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
                maxTokensCap={maxTokensCap}
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
