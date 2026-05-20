import { msg, NONE_VALUE } from "@/lib/config/constants";
import type { StreamOverrides } from "@/lib/validation/chat";
import {
  SAMPLING_FIELDS,
  type ConversationOverridesForm,
} from "@/lib/validation/rp-forms";
import type { ModelSamplerMemory } from "@/store/chat-store";
import type { UseFormReturn } from "react-hook-form";

export const REASONING_EFFORT_KEY = {
  minimal: msg("CHAT.OVERRIDES.EFFORT_MINIMAL"),
  low: msg("CHAT.OVERRIDES.EFFORT_LOW"),
  medium: msg("CHAT.OVERRIDES.EFFORT_MEDIUM"),
  high: msg("CHAT.OVERRIDES.EFFORT_HIGH"),
  xhigh: msg("CHAT.OVERRIDES.EFFORT_XHIGH"),
} as const;

export const WEB_SEARCH_ENGINE_KEY = {
  auto: msg("CHAT.OVERRIDES.ENGINE_AUTO"),
  native: msg("CHAT.OVERRIDES.ENGINE_NATIVE"),
  tavily: msg("CHAT.OVERRIDES.ENGINE_TAVILY"),
  exa: msg("CHAT.OVERRIDES.ENGINE_EXA"),
} as const;

export const WEB_SEARCH_CONTEXT_KEY = {
  low: msg("CHAT.OVERRIDES.CONTEXT_LOW"),
  medium: msg("CHAT.OVERRIDES.CONTEXT_MEDIUM"),
  high: msg("CHAT.OVERRIDES.CONTEXT_HIGH"),
} as const;

export function resetSampling(form: UseFormReturn<ConversationOverridesForm>) {
  for (const field of SAMPLING_FIELDS) {
    form.setValue(field, null, { shouldDirty: true });
  }
}

// Source for samplingValues: only the sampler slider keys, each nullable.
type SamplerSource = Partial<
  Record<(typeof SAMPLING_FIELDS)[number], number | null | undefined>
>;

// Sampler slider values, null when unset. Shared by form reset/build paths.
function samplingValues(src: SamplerSource) {
  return {
    temperature: src.temperature ?? null,
    topP: src.topP ?? null,
    topK: src.topK ?? null,
    minP: src.minP ?? null,
    topA: src.topA ?? null,
    frequencyPenalty: src.frequencyPenalty ?? null,
    presencePenalty: src.presencePenalty ?? null,
    repetitionPenalty: src.repetitionPenalty ?? null,
    maxTokens: src.maxTokens ?? null,
  };
}

type ReasoningEffort = ConversationOverridesForm["reasoningEffort"];

// "__none__" sentinel collapses to null for the persisted/streamed payload.
function effortValue(effort: ReasoningEffort) {
  return effort === NONE_VALUE ? null : effort;
}

export function writeSamplerMemory(
  data: ConversationOverridesForm,
  activeModelName: string | null | undefined,
  samplerMemoryByModel: Record<string, ModelSamplerMemory>,
  setSamplerMemoryByModel: (value: Record<string, ModelSamplerMemory>) => void,
) {
  if (!activeModelName) return;
  setSamplerMemoryByModel({
    ...samplerMemoryByModel,
    [activeModelName]: {
      ...samplingValues(data),
      reasoningEffort: effortValue(
        data.reasoningEffort,
      ) as ModelSamplerMemory["reasoningEffort"],
      extraBody: data.extraBody || null,
    },
  });
}

// Defaults mode: seed the form from the chat-defaults atom, layered with the
// active model's remembered sampler values.
function buildDefaultsForm(
  chatDefaults: StreamOverrides,
  modelMemory: ModelSamplerMemory,
): ConversationOverridesForm {
  const layered = {
    temperature: modelMemory.temperature ?? chatDefaults.temperature,
    topP: modelMemory.topP ?? chatDefaults.topP,
    topK: modelMemory.topK ?? chatDefaults.topK,
    minP: modelMemory.minP ?? chatDefaults.minP,
    topA: modelMemory.topA ?? chatDefaults.topA,
    frequencyPenalty:
      modelMemory.frequencyPenalty ?? chatDefaults.frequencyPenalty,
    presencePenalty:
      modelMemory.presencePenalty ?? chatDefaults.presencePenalty,
    repetitionPenalty:
      modelMemory.repetitionPenalty ?? chatDefaults.repetitionPenalty,
    maxTokens: modelMemory.maxTokens ?? chatDefaults.maxTokens,
  };
  return {
    personaId: NONE_VALUE,
    presetId: NONE_VALUE,
    reasoningEffort: (modelMemory.reasoningEffort ??
      chatDefaults.reasoningEffort ??
      NONE_VALUE) as ReasoningEffort,
    chatMemory: chatDefaults.chatMemory ?? 8,
    authorNoteDepth: chatDefaults.authorNoteDepth ?? 4,
    systemPromptOverride: chatDefaults.systemPromptOverride ?? "",
    authorNote: chatDefaults.authorNote ?? "",
    webSearchEnabled: false,
    webSearchEngine: chatDefaults.webSearchEngine ?? "auto",
    webSearchContextSize: chatDefaults.webSearchContextSize ?? "medium",
    characterIds: [],
    lorebookIds: [],
    ...samplingValues(layered),
    extraBody: modelMemory.extraBody ?? chatDefaults.extraBody ?? "",
    streamingEnabled: chatDefaults.streamingEnabled ?? true,
  };
}

type Nullable<T> = T | null;

// The persisted conversation_settings row: every column nullable, sampler
// fields included so samplingValues() can read them.
type ConvSettings = {
  personaId: Nullable<string>;
  presetId: Nullable<string>;
  reasoningEffort: Nullable<string>;
  chatMemory: Nullable<number>;
  authorNoteDepth: Nullable<number>;
  systemPromptOverride: Nullable<string>;
  authorNote: Nullable<string>;
  webSearchEnabled: Nullable<boolean>;
  webSearchEngine: Nullable<string>;
  webSearchContextSize: Nullable<string>;
  temperature: Nullable<number>;
  topP: Nullable<number>;
  topK: Nullable<number>;
  minP: Nullable<number>;
  topA: Nullable<number>;
  frequencyPenalty: Nullable<number>;
  presencePenalty: Nullable<number>;
  repetitionPenalty: Nullable<number>;
  maxTokens: Nullable<number>;
  extraBody: Nullable<string>;
  streamingEnabled: Nullable<boolean>;
};

type ConvBindings = {
  characters: { characterId: string }[];
  lorebooks: { lorebookId: string }[];
};

// Conversation mode: seed the form from the persisted settings + bindings rows.
function buildSettingsForm(
  settings: ConvSettings,
  bindings: ConvBindings,
): ConversationOverridesForm {
  return {
    personaId: settings.personaId ?? NONE_VALUE,
    presetId: settings.presetId ?? NONE_VALUE,
    reasoningEffort: (settings.reasoningEffort ??
      NONE_VALUE) as ReasoningEffort,
    chatMemory: settings.chatMemory ?? 8,
    authorNoteDepth: settings.authorNoteDepth ?? 4,
    systemPromptOverride: settings.systemPromptOverride ?? "",
    authorNote: settings.authorNote ?? "",
    webSearchEnabled: settings.webSearchEnabled ?? false,
    webSearchEngine: settings.webSearchEngine ?? "auto",
    webSearchContextSize: settings.webSearchContextSize ?? "medium",
    characterIds: bindings.characters.map((c) => c.characterId),
    lorebookIds: bindings.lorebooks.map((l) => l.lorebookId),
    ...samplingValues(settings),
    extraBody: settings.extraBody ?? "",
    streamingEnabled: settings.streamingEnabled ?? true,
  };
}

// Picks the form seed by mode: defaults atom (layered with per-model sampler
// memory) or the persisted conversation rows. Undefined while rows load,
// which RHF's `values` treats as "keep current".
export function computeFormValues(args: {
  isDefaultsMode: boolean;
  chatDefaults: StreamOverrides;
  activeModelName: string | null | undefined;
  samplerMemoryByModel: Record<string, ModelSamplerMemory>;
  settings: ConvSettings | undefined;
  bindings: ConvBindings | undefined;
}): ConversationOverridesForm | undefined {
  if (args.isDefaultsMode) {
    const memory = args.activeModelName
      ? (args.samplerMemoryByModel[args.activeModelName] ?? {})
      : {};
    return buildDefaultsForm(args.chatDefaults, memory);
  }
  if (!args.settings || !args.bindings) return undefined;
  return buildSettingsForm(args.settings, args.bindings);
}

// Defaults mode submit payload: the StreamOverrides written to the atom.
export function buildDefaultsOverrides(
  data: ConversationOverridesForm,
): StreamOverrides {
  return {
    reasoningEffort: effortValue(
      data.reasoningEffort,
    ) as StreamOverrides["reasoningEffort"],
    chatMemory: data.chatMemory,
    systemPromptOverride: data.systemPromptOverride || null,
    authorNote: data.authorNote || null,
    authorNoteDepth: data.authorNoteDepth,
    ...samplingValues(data),
    extraBody: data.extraBody || null,
    streamingEnabled: data.streamingEnabled,
  };
}

// Conversation mode submit payload: the conversation_settings update body.
export function buildSettingsBody(data: ConversationOverridesForm) {
  return {
    chatMemory: data.chatMemory,
    authorNoteDepth: data.authorNoteDepth,
    systemPromptOverride: data.systemPromptOverride || null,
    authorNote: data.authorNote || null,
    personaId: data.personaId === NONE_VALUE ? null : data.personaId,
    presetId: data.presetId === NONE_VALUE ? null : data.presetId,
    reasoningEffort: effortValue(data.reasoningEffort) as
      | "xhigh"
      | "high"
      | "medium"
      | "low"
      | "minimal"
      | "none"
      | null,
    webSearchEnabled: data.webSearchEnabled,
    webSearchEngine: data.webSearchEngine as
      | "auto"
      | "native"
      | "exa"
      | "tavily",
    webSearchContextSize: data.webSearchContextSize as
      | "low"
      | "medium"
      | "high",
    ...samplingValues(data),
    extraBody: data.extraBody || null,
    streamingEnabled: data.streamingEnabled,
  };
}

// Conversation mode submit payload: the bindings update body.
export function buildBindingsBody(data: ConversationOverridesForm) {
  return {
    characters: data.characterIds.map((id, i) => ({
      characterId: id,
      orderIndex: i,
      isActive: true,
    })),
    lorebookIds: data.lorebookIds,
  };
}
