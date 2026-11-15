import type { ModelMetadata } from "@/openapi";
import type { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";

const CAPABILITY_ORDER: [keyof ModelMetadata, TranslationKey, IconName][] = [
  ["isReasoning", "MODELS.CAPABILITY.REASONING", "brain"],
  ["supportsTools", "MODELS.CAPABILITY.TOOLS", "wrench"],
  ["supportsParallelTools", "MODELS.CAPABILITY.PARALLEL_TOOLS", "wrench"],
  ["supportsVision", "MODELS.CAPABILITY.VISION", "eye"],
  ["supportsAudio", "MODELS.CAPABILITY.AUDIO_IN", "mic"],
  ["supportsAudioOutput", "MODELS.CAPABILITY.AUDIO_OUT", "music"],
  ["supportsVideo", "MODELS.CAPABILITY.VIDEO", "video"],
  ["supportsPdf", "MODELS.CAPABILITY.FILES", "file-text"],
  ["supportsCache", "MODELS.CAPABILITY.CACHE", "database"],
  ["supportsResponseFormat", "MODELS.CAPABILITY.STRUCTURED", "code"],
  ["supportsWebSearch", "MODELS.CAPABILITY.WEB_SEARCH", "globe"],
  ["supportsComputerUse", "MODELS.CAPABILITY.COMPUTER_USE", "monitor"],
  ["supportsAssistantPrefill", "MODELS.CAPABILITY.PREFILL", "pencil"],
  ["supportsCodeExecution", "MODELS.CAPABILITY.CODE_EXEC", "terminal"],
  ["supportsFileSearch", "MODELS.CAPABILITY.FILE_SEARCH", "search"],
  ["supportsServiceTier", "MODELS.CAPABILITY.SERVICE_TIER", "layers"],
  ["supportsUrlContext", "MODELS.CAPABILITY.URL_CONTEXT", "link"],
  ["supportsNativeStreaming", "MODELS.CAPABILITY.STREAMING", "activity"],
  ["supportsNativeStructuredOutput", "MODELS.CAPABILITY.NATIVE_JSON", "code"],
  ["supportsSystemMessages", "MODELS.CAPABILITY.SYSTEM_MSG", "message-square"],
];

export type CapabilityChip = {
  labelKey: TranslationKey;
  icon: IconName;
  count?: number;
};

export function deriveCapabilityChips(
  metadata: ModelMetadata,
): CapabilityChip[] {
  const boolChips: CapabilityChip[] = CAPABILITY_ORDER.filter(
    (c) => metadata[c[0]] === true,
  ).map((c) => ({ labelKey: c[1], icon: c[2] }));
  // The provider's published limit, not a configured guess.
  const refs = metadata.imageParams?.maxReferenceImages ?? 0;
  if (refs > 1) {
    boolChips.push({
      labelKey: "MODELS.CAPABILITY.IMAGE_INPUTS",
      icon: "image",
      count: refs,
    });
  }
  return boolChips;
}

export function hasAnyParameter(metadata: ModelMetadata): boolean {
  return (
    (metadata.supportedParametersAll ?? []).length > 0 ||
    (metadata.supportedParameters ?? []).length > 0 ||
    Object.keys(metadata.defaultParameters ?? {}).length > 0
  );
}
