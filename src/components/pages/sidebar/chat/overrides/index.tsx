"use client";

import { SyncBadge } from "@/components/elements/badge/sync-badge";
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
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { analytics } from "@/lib/analytics";
import { NONE_VALUE } from "@/lib/config/constants";
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
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { SamplingFields } from "../rp/sampling-fields";
import {
  OverridesBindingFields,
  OverridesGenerationFields,
  OverridesPromptFields,
} from "./override-fields";
import {
  buildBindingsBody,
  buildDefaultsOverrides,
  buildSettingsBody,
  computeFormValues,
  resetSampling,
  writeSamplerMemory,
} from "./form-handler";

type DrawerProps = {
  convId: string | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ConversationOverridesDrawer(props: DrawerProps) {
  const t = useTranslations();
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

  const updateSettings = useUpdateChatSettingsMutation();
  const updateBindings = useUpdateChatBindingsMutation();

  const settings = settingsQuery.data;
  const bindings = bindingsQuery.data;

  // `values` resyncs the form whenever this object changes; keepDirtyValues
  // protects in-flight edits from a background query refetch.
  const formValues = computeFormValues({
    isDefaultsMode,
    chatDefaults,
    activeModelName,
    samplerMemoryByModel,
    settings,
    bindings,
  });

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
                <OverridesBindingFields control={form.control} />
              )}

              <OverridesGenerationFields
                control={form.control}
                showConversationFields={showConversationFields}
                webSearchEnabled={webSearchEnabled}
              />

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
