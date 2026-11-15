import {
  DEFAULT_AUTHOR_NOTE_DEPTH,
  msg,
  NONE_VALUE,
  type TranslationKey,
} from "@/lib/config/constants";
import { conversationCharacters } from "@/lib/db/schema/shared";
import type { ConversationSettingsProjection } from "@/lib/db/conversation-settings";
import {
  formReasoningEffortToValue,
  narrowReasoningEffort,
  narrowWebSearchContextSize,
  narrowWebSearchEngine,
  type ReasoningEffort,
  type StreamOverrides,
  type WebSearchContextSize,
  type WebSearchEngine,
} from "@/lib/validation/chat";
import {
  SAMPLING_FIELDS,
  type ConversationOverridesForm,
} from "@/lib/validation/rp-forms";
import type { ModelSamplerMemory } from "@/store/chat-store";

export const REASONING_EFFORT_KEY: Record<
  Exclude<ReasoningEffort, "none">,
  TranslationKey
> = {
  minimal: msg("CHAT.OVERRIDES.EFFORT_MINIMAL"),
  low: msg("CHAT.OVERRIDES.EFFORT_LOW"),
  medium: msg("CHAT.OVERRIDES.EFFORT_MEDIUM"),
  high: msg("CHAT.OVERRIDES.EFFORT_HIGH"),
  xhigh: msg("CHAT.OVERRIDES.EFFORT_XHIGH"),
  max: msg("CHAT.OVERRIDES.EFFORT_MAX"),
};

export const REASONING_LEADING_OPTIONS = [
  { value: NONE_VALUE, labelKey: msg("CHAT.OVERRIDES.MODEL_DEFAULT") },
  { value: "none", labelKey: msg("CHAT.OVERRIDES.OFF") },
];

export const WEB_SEARCH_ENGINE_KEY: Record<WebSearchEngine, TranslationKey> = {
  auto: msg("CHAT.OVERRIDES.ENGINE_AUTO"),
  native: msg("CHAT.OVERRIDES.ENGINE_NATIVE"),
  tavily: msg("CHAT.OVERRIDES.ENGINE_TAVILY"),
  exa: msg("CHAT.OVERRIDES.ENGINE_EXA"),
};

export const WEB_SEARCH_CONTEXT_KEY: Record<
  WebSearchContextSize,
  TranslationKey
> = {
  low: msg("CHAT.OVERRIDES.CONTEXT_LOW"),
  medium: msg("CHAT.OVERRIDES.CONTEXT_MEDIUM"),
  high: msg("CHAT.OVERRIDES.CONTEXT_HIGH"),
};

type SamplerSource = Partial<
  Record<(typeof SAMPLING_FIELDS)[number], number | null | undefined>
>;

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
      reasoningEffort: formReasoningEffortToValue(data.reasoningEffort),
      extraBody: data.extraBody || null,
    },
  });
}

function sharedForm(src: StreamOverrides) {
  return {
    authorNoteDepth: src.authorNoteDepth ?? DEFAULT_AUTHOR_NOTE_DEPTH,
    systemPromptOverride: src.systemPromptOverride ?? "",
    authorNote: src.authorNote ?? "",
    webSearchEnabled: src.webSearchEnabled ?? false,
    webSearchEngine: narrowWebSearchEngine(src.webSearchEngine),
    webSearchContextSize: narrowWebSearchContextSize(src.webSearchContextSize),
    memoryEnabled: src.memoryEnabled ?? false,
    imageEnabled: src.imageEnabled ?? false,
    voiceEnabled: src.voiceEnabled ?? true,
    utilityModel: src.utilityModel ?? NONE_VALUE,
    titleModel: src.titleModel ?? NONE_VALUE,
    titlePrompt: src.titlePrompt ?? "",
    promptInstruction: src.promptInstruction ?? "",
    imageModel: src.imageModel ?? NONE_VALUE,
    imagePreview: src.imagePreview ?? false,
    useCharAvatarRef: src.useCharAvatarRef ?? false,
  };
}

function buildDefaultsForm(
  chatDefaults: StreamOverrides,
  modelMemory: ModelSamplerMemory,
  pendingPreset?: InheritSource | null,
): ConversationOverridesForm {
  // Precedence must stay identical to seedConversation's, else the drawer shows
  // values that differ from the ones sent.
  const p = pendingPreset ?? {};
  const layered = Object.fromEntries(
    SAMPLING_FIELDS.map((field) => [
      field,
      modelMemory[field] ?? p[field] ?? chatDefaults[field],
    ]),
  );
  return {
    personaId: NONE_VALUE,
    presetId: NONE_VALUE,
    reasoningEffort:
      modelMemory.reasoningEffort ?? chatDefaults.reasoningEffort ?? NONE_VALUE,
    chatMemory: chatDefaults.chatMemory ?? null,
    contextTokens: chatDefaults.contextTokens ?? null,
    ...sharedForm(chatDefaults),
    characterIds: [],
    lorebookIds: [],
    ...samplingValues(layered),
    extraBody: modelMemory.extraBody ?? chatDefaults.extraBody ?? "",
    streamingEnabled: chatDefaults.streamingEnabled ?? null,
    autoScrollStream: chatDefaults.autoScrollStream ?? null,
    showReasoning: chatDefaults.showReasoning ?? null,
  };
}

type ConvBindings = {
  characters: { characterId: string }[];
  lorebooks: { lorebookId: string }[];
};

type InheritSource = {
  streamingEnabled?: boolean | null;
  autoScrollStream?: boolean | null;
  showReasoning?: boolean | null;
} & Partial<
  Record<
    (typeof SAMPLING_FIELDS)[number] | "chatMemory" | "contextTokens",
    number | null
  >
>;

function buildSettingsForm(
  settings: ConversationSettingsProjection,
  bindings: ConvBindings,
  preset: InheritSource | null,
): ConversationOverridesForm {
  return {
    personaId: settings.personaId ?? NONE_VALUE,
    presetId: settings.presetId ?? NONE_VALUE,
    reasoningEffort: narrowReasoningEffort(
      settings.reasoningEffort,
      NONE_VALUE,
    ),
    chatMemory: settings.chatMemory ?? preset?.chatMemory ?? null,
    contextTokens: settings.contextTokens ?? preset?.contextTokens ?? null,
    ...sharedForm(settings),
    characterIds: bindings.characters.map((c) => c.characterId),
    lorebookIds: bindings.lorebooks.map((l) => l.lorebookId),
    ...samplingValues(
      Object.fromEntries(
        SAMPLING_FIELDS.map((field) => [
          field,
          settings[field] ?? preset?.[field],
        ]),
      ),
    ),
    extraBody: settings.extraBody ?? "",
    streamingEnabled:
      settings.streamingEnabled ?? preset?.streamingEnabled ?? true,
    autoScrollStream:
      settings.autoScrollStream ?? preset?.autoScrollStream ?? true,
    showReasoning: settings.showReasoning ?? preset?.showReasoning ?? true,
  };
}

export function computeFormValues(args: {
  isDefaultsMode: boolean;
  chatDefaults: StreamOverrides;
  activeModelName: string | null | undefined;
  samplerMemoryByModel: Record<string, ModelSamplerMemory>;
  settings: ConversationSettingsProjection | null | undefined;
  bindings: ConvBindings | null | undefined;
  preset: InheritSource | null;
}): ConversationOverridesForm | undefined {
  if (args.isDefaultsMode) {
    const memory = args.activeModelName
      ? (args.samplerMemoryByModel[args.activeModelName] ?? {})
      : {};
    return buildDefaultsForm(args.chatDefaults, memory, args.preset);
  }
  if (!args.settings || !args.bindings) return undefined;
  return buildSettingsForm(args.settings, args.bindings, args.preset);
}

function sharedOverrides(data: ConversationOverridesForm) {
  return {
    reasoningEffort: formReasoningEffortToValue(data.reasoningEffort),
    systemPromptOverride: data.systemPromptOverride || null,
    authorNote: data.authorNote || null,
    authorNoteDepth: data.authorNoteDepth,
    webSearchEnabled: data.webSearchEnabled,
    webSearchEngine: data.webSearchEngine,
    webSearchContextSize: data.webSearchContextSize,
    ...samplingValues(data),
    extraBody: data.extraBody || null,
    memoryEnabled: data.memoryEnabled,
    imageEnabled: data.imageEnabled,
    voiceEnabled: data.voiceEnabled,
    utilityModel: data.utilityModel === NONE_VALUE ? null : data.utilityModel,
    titleModel: data.titleModel === NONE_VALUE ? null : data.titleModel,
    titlePrompt: data.titlePrompt || null,
    promptInstruction: data.promptInstruction || null,
    imageModel: data.imageModel === NONE_VALUE ? null : data.imageModel,
    imagePreview: data.imagePreview,
    useCharAvatarRef: data.useCharAvatarRef,
  };
}

export function buildDefaultsOverrides(
  data: ConversationOverridesForm,
): StreamOverrides {
  return {
    ...sharedOverrides(data),
    chatMemory: data.chatMemory,
    contextTokens: data.contextTokens,
    streamingEnabled: data.streamingEnabled,
    autoScrollStream: data.autoScrollStream,
    showReasoning: data.showReasoning,
  };
}

function overrideOrInherit(
  formValue: boolean | null | undefined,
  presetValue: boolean | null | undefined,
): boolean | null {
  if (formValue == null) return null;
  const inherited = presetValue ?? true;
  return formValue === inherited ? null : formValue;
}

export function buildSettingsBody(
  data: ConversationOverridesForm,
  preset: InheritSource | null,
) {
  return {
    ...sharedOverrides(data),
    chatMemory: data.chatMemory ?? null,
    contextTokens: data.contextTokens ?? null,
    personaId: data.personaId === NONE_VALUE ? null : data.personaId,
    presetId: data.presetId === NONE_VALUE ? null : data.presetId,
    streamingEnabled: overrideOrInherit(
      data.streamingEnabled,
      preset?.streamingEnabled,
    ),
    autoScrollStream: overrideOrInherit(
      data.autoScrollStream,
      preset?.autoScrollStream,
    ),
    showReasoning: overrideOrInherit(data.showReasoning, preset?.showReasoning),
  };
}

type ExistingCharBinding = Pick<
  typeof conversationCharacters.$inferSelect,
  "characterId" | "isActive" | "overrides"
>;

export function buildBindingsBody(
  data: ConversationOverridesForm,
  existing?: { characters: ExistingCharBinding[] } | null,
) {
  const existingByCharId = new Map(
    (existing?.characters ?? []).map((c) => [c.characterId, c]),
  );
  return {
    characters: data.characterIds.map((id, i) => {
      const prior = existingByCharId.get(id);
      return {
        characterId: id,
        orderIndex: i,
        isActive: prior?.isActive ?? true,
        overrides: prior?.overrides ?? null,
      };
    }),
    lorebookIds: data.lorebookIds,
  };
}
