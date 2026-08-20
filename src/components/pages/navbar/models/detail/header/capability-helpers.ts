import type { ModelMetadata } from "@/lib/api/pricing";
import { TranslationKey } from "@/lib/config/constants";

const CAPABILITY_ORDER: {
  field: keyof ModelMetadata;
  labelKey: TranslationKey;
  icon: string;
}[] = [
  {
    field: "isReasoning",
    labelKey: "MODELS.CAPABILITY.REASONING",
    icon: "brain",
  },
  {
    field: "supportsTools",
    labelKey: "MODELS.CAPABILITY.TOOLS",
    icon: "wrench",
  },
  {
    field: "supportsParallelTools",
    labelKey: "MODELS.CAPABILITY.PARALLEL_TOOLS",
    icon: "wrench",
  },
  {
    field: "supportsVision",
    labelKey: "MODELS.CAPABILITY.VISION",
    icon: "eye",
  },
  {
    field: "supportsAudio",
    labelKey: "MODELS.CAPABILITY.AUDIO_IN",
    icon: "mic",
  },
  {
    field: "supportsAudioOutput",
    labelKey: "MODELS.CAPABILITY.AUDIO_OUT",
    icon: "music",
  },
  {
    field: "supportsVideo",
    labelKey: "MODELS.CAPABILITY.VIDEO",
    icon: "video",
  },
  {
    field: "supportsPdf",
    labelKey: "MODELS.CAPABILITY.FILES",
    icon: "file-text",
  },
  {
    field: "supportsCache",
    labelKey: "MODELS.CAPABILITY.CACHE",
    icon: "database",
  },
  {
    field: "supportsResponseFormat",
    labelKey: "MODELS.CAPABILITY.STRUCTURED",
    icon: "code",
  },
  {
    field: "supportsWebSearch",
    labelKey: "MODELS.CAPABILITY.WEB_SEARCH",
    icon: "globe",
  },
  {
    field: "supportsComputerUse",
    labelKey: "MODELS.CAPABILITY.COMPUTER_USE",
    icon: "monitor",
  },
  {
    field: "supportsAssistantPrefill",
    labelKey: "MODELS.CAPABILITY.PREFILL",
    icon: "pencil",
  },
  {
    field: "supportsCodeExecution",
    labelKey: "MODELS.CAPABILITY.CODE_EXEC",
    icon: "terminal",
  },
  {
    field: "supportsFileSearch",
    labelKey: "MODELS.CAPABILITY.FILE_SEARCH",
    icon: "search",
  },
  {
    field: "supportsServiceTier",
    labelKey: "MODELS.CAPABILITY.SERVICE_TIER",
    icon: "layers",
  },
  {
    field: "supportsUrlContext",
    labelKey: "MODELS.CAPABILITY.URL_CONTEXT",
    icon: "link",
  },
  {
    field: "supportsNativeStreaming",
    labelKey: "MODELS.CAPABILITY.STREAMING",
    icon: "activity",
  },
  {
    field: "supportsNativeStructuredOutput",
    labelKey: "MODELS.CAPABILITY.NATIVE_JSON",
    icon: "code",
  },
  {
    field: "supportsSystemMessages",
    labelKey: "MODELS.CAPABILITY.SYSTEM_MSG",
    icon: "message-square",
  },
];

export type CapabilityChip = {
  labelKey: TranslationKey;
  icon: string;
  count?: number;
};

export function deriveCapabilityChips(
  metadata: ModelMetadata,
): CapabilityChip[] {
  const boolChips: CapabilityChip[] = CAPABILITY_ORDER.filter(
    (c) => metadata[c.field] === true,
  ).map((c) => ({ labelKey: c.labelKey, icon: c.icon }));
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

export function hasAnyCapability(metadata: ModelMetadata): boolean {
  return CAPABILITY_ORDER.some((c) => metadata[c.field] === true);
}

export function hasAnyQuickStat(metadata: ModelMetadata): boolean {
  const hasQuant =
    !!metadata.quantization &&
    metadata.quantization.toLowerCase() !== "unknown";
  return Boolean(
    metadata.deprecationDate ||
    metadata.expirationDate ||
    metadata.huggingFaceId ||
    hasQuant,
  );
}

export function hasAnyParameter(metadata: ModelMetadata): boolean {
  return (
    (metadata.supportedParametersAll ?? []).length > 0 ||
    (metadata.supportedParameters ?? []).length > 0 ||
    Object.keys(metadata.defaultParameters ?? {}).length > 0
  );
}
