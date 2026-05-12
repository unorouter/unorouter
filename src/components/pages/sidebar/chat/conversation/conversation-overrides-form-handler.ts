import { analytics } from "@/lib/analytics";
import type { ConversationOverridesForm } from "@/lib/validation/rp-forms";
import type { ModelSamplerMemory } from "@/store/chat-store";
import type { UseFormReturn } from "react-hook-form";

export const SAMPLING_FIELDS = [
  "temperature",
  "topP",
  "topK",
  "minP",
  "topA",
  "frequencyPenalty",
  "presencePenalty",
  "repetitionPenalty",
  "maxTokens",
] as const;

export function resetSampling(form: UseFormReturn<ConversationOverridesForm>) {
  form.setValue("temperature", null, { shouldDirty: true });
  form.setValue("topP", null, { shouldDirty: true });
  form.setValue("topK", null, { shouldDirty: true });
  form.setValue("minP", null, { shouldDirty: true });
  form.setValue("topA", null, { shouldDirty: true });
  form.setValue("frequencyPenalty", null, { shouldDirty: true });
  form.setValue("presencePenalty", null, { shouldDirty: true });
  form.setValue("repetitionPenalty", null, { shouldDirty: true });
  form.setValue("maxTokens", null, { shouldDirty: true });
  analytics.chat.samplingReset();
}

export function writeSamplerMemory(
  data: ConversationOverridesForm,
  activeModelName: string | null | undefined,
  samplerMemoryByModel: Record<string, ModelSamplerMemory>,
  setSamplerMemoryByModel: (value: Record<string, ModelSamplerMemory>) => void,
) {
  if (!activeModelName) return;
  const next: ModelSamplerMemory = {
    temperature: data.temperature,
    topP: data.topP,
    topK: data.topK,
    minP: data.minP,
    topA: data.topA,
    frequencyPenalty: data.frequencyPenalty,
    presencePenalty: data.presencePenalty,
    repetitionPenalty: data.repetitionPenalty,
    maxTokens: data.maxTokens,
    reasoningEffort:
      data.reasoningEffort === "__none__"
        ? null
        : (data.reasoningEffort as ModelSamplerMemory["reasoningEffort"]),
    extraBody: data.extraBody || null,
  };
  setSamplerMemoryByModel({
    ...samplerMemoryByModel,
    [activeModelName]: next,
  });
}
