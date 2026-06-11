import type { TranslationKey } from "@/lib/config/constants";
import type { SamplingPresetBody } from "@/lib/validation/rp";

type StarterPresetSlug = "general-assistant" | "narrative-rp" | "turn-based-rp";

type StarterPreset = {
  slug: StarterPresetSlug;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  body: SamplingPresetBody;
};

const NULL_SAMPLING: Pick<
  SamplingPresetBody,
  | "topP"
  | "topK"
  | "minP"
  | "topA"
  | "frequencyPenalty"
  | "presencePenalty"
  | "repetitionPenalty"
  | "extraBody"
  | "mainPrompt"
  | "postHistory"
  | "prefill"
  | "streamingEnabled"
  | "chatMemory"
> = {
  topP: null,
  topK: null,
  minP: null,
  topA: null,
  frequencyPenalty: null,
  presencePenalty: null,
  repetitionPenalty: null,
  extraBody: null,
  mainPrompt: null,
  postHistory: null,
  prefill: null,
  // null = system default (streaming on, chatMemory 8).
  streamingEnabled: null,
  chatMemory: null,
};

export const STARTER_PRESETS: StarterPreset[] = [
  {
    slug: "general-assistant",
    labelKey: "RP.STARTER_PRESET_ASSISTANT",
    descriptionKey: "RP.STARTER_PRESET_ASSISTANT_DESC",
    body: {
      name: "General Assistant",
      temperature: 0.7,
      ...NULL_SAMPLING,
      maxTokens: 2048,
      forceAlternateRoles: false,
      noSystemRole: false,
      mustStartWithUserInput: false,
      geminiBlockOff: false,
      providers: null,
      promptTemplate: null,
    },
  },
  {
    slug: "narrative-rp",
    labelKey: "RP.STARTER_PRESET_NARRATIVE",
    descriptionKey: "RP.STARTER_PRESET_NARRATIVE_DESC",
    body: {
      name: "Narrative Roleplay",
      temperature: 1.0,
      ...NULL_SAMPLING,
      maxTokens: 4096,
      forceAlternateRoles: false,
      noSystemRole: false,
      mustStartWithUserInput: false,
      geminiBlockOff: true,
      providers: null,
      promptTemplate: null,
    },
  },
  {
    slug: "turn-based-rp",
    labelKey: "RP.STARTER_PRESET_TURN_BASED",
    descriptionKey: "RP.STARTER_PRESET_TURN_BASED_DESC",
    body: {
      name: "Turn-based Roleplay",
      temperature: 0.9,
      ...NULL_SAMPLING,
      maxTokens: 1024,
      forceAlternateRoles: true,
      noSystemRole: false,
      mustStartWithUserInput: true,
      geminiBlockOff: false,
      providers: null,
      promptTemplate: null,
    },
  },
];
