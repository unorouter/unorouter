import type { ModelMetadata } from "@/lib/api/pricing";
import { TranslationKey } from "@/lib/config/constants";

export const CAPABILITY_ORDER: {
  field: keyof ModelMetadata;
  labelKey: TranslationKey;
}[] = [
  { field: "isReasoning", labelKey: "MODELS.CAPABILITY.REASONING" },
  { field: "supportsTools", labelKey: "MODELS.CAPABILITY.TOOLS" },
  {
    field: "supportsParallelTools",
    labelKey: "MODELS.CAPABILITY.PARALLEL_TOOLS",
  },
  { field: "supportsVision", labelKey: "MODELS.CAPABILITY.VISION" },
  { field: "supportsAudio", labelKey: "MODELS.CAPABILITY.AUDIO_IN" },
  { field: "supportsAudioOutput", labelKey: "MODELS.CAPABILITY.AUDIO_OUT" },
  { field: "supportsVideo", labelKey: "MODELS.CAPABILITY.VIDEO" },
  { field: "supportsPdf", labelKey: "MODELS.CAPABILITY.FILES" },
  { field: "supportsCache", labelKey: "MODELS.CAPABILITY.CACHE" },
  { field: "supportsResponseFormat", labelKey: "MODELS.CAPABILITY.STRUCTURED" },
  { field: "supportsWebSearch", labelKey: "MODELS.CAPABILITY.WEB_SEARCH" },
  { field: "supportsComputerUse", labelKey: "MODELS.CAPABILITY.COMPUTER_USE" },
  { field: "supportsAssistantPrefill", labelKey: "MODELS.CAPABILITY.PREFILL" },
  { field: "supportsCodeExecution", labelKey: "MODELS.CAPABILITY.CODE_EXEC" },
  { field: "supportsFileSearch", labelKey: "MODELS.CAPABILITY.FILE_SEARCH" },
  { field: "supportsServiceTier", labelKey: "MODELS.CAPABILITY.SERVICE_TIER" },
  { field: "supportsUrlContext", labelKey: "MODELS.CAPABILITY.URL_CONTEXT" },
  { field: "supportsNativeStreaming", labelKey: "MODELS.CAPABILITY.STREAMING" },
  {
    field: "supportsNativeStructuredOutput",
    labelKey: "MODELS.CAPABILITY.NATIVE_JSON",
  },
  { field: "supportsSystemMessages", labelKey: "MODELS.CAPABILITY.SYSTEM_MSG" },
];

export function deriveCapabilityChips(
  metadata: ModelMetadata,
): TranslationKey[] {
  return CAPABILITY_ORDER.filter((c) => metadata[c.field] === true).map(
    (c) => c.labelKey,
  );
}

export function hasAnyCapability(metadata: ModelMetadata): boolean {
  return CAPABILITY_ORDER.some((c) => metadata[c.field] === true);
}

export function hasAnyQuickStat(metadata: ModelMetadata): boolean {
  const hasQuant =
    !!metadata.quantization &&
    metadata.quantization.toLowerCase() !== "unknown";
  const hasReasoning =
    !!metadata.reasoningEfforts && metadata.reasoningEfforts.length > 0;
  return Boolean(
    metadata.contextWindow ||
    metadata.maxInputTokens ||
    metadata.maxOutputTokens ||
    metadata.mode ||
    metadata.tokenizer ||
    metadata.knowledgeCutoff ||
    metadata.deprecationDate ||
    metadata.expirationDate ||
    metadata.huggingFaceId ||
    metadata.isModerated === true ||
    hasQuant ||
    hasReasoning,
  );
}

export function hasAnyParameter(metadata: ModelMetadata): boolean {
  return (
    (metadata.supportedParametersAll ?? []).length > 0 ||
    (metadata.supportedParameters ?? []).length > 0 ||
    Object.keys(metadata.defaultParameters ?? {}).length > 0
  );
}

export function hasAnyModality(metadata: ModelMetadata): boolean {
  return (
    (metadata.inputModalities ?? []).length > 0 ||
    (metadata.outputModalities ?? []).length > 0
  );
}
