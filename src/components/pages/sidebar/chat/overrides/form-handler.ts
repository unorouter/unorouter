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
import type { UseFormReturn } from "react-hook-form";

export const REASONING_EFFORT_KEY: Record<
  Exclude<ReasoningEffort, "none">,
  TranslationKey
> = {
  minimal: msg("CHAT.OVERRIDES.EFFORT_MINIMAL"),
  low: msg("CHAT.OVERRIDES.EFFORT_LOW"),
  medium: msg("CHAT.OVERRIDES.EFFORT_MEDIUM"),
  high: msg("CHAT.OVERRIDES.EFFORT_HIGH"),
  xhigh: msg("CHAT.OVERRIDES.EFFORT_XHIGH"),
};

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

export function resetSampling(form: UseFormReturn<ConversationOverridesForm>) {
  for (const field of SAMPLING_FIELDS) {
    form.setValue(field, null, { shouldDirty: true });
  }
}

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

function resolveSamplingFromPreset(
  src: SamplerSource,
  preset: InheritSource | null,
): ReturnType<typeof samplingValues> {
  return samplingValues(
    Object.fromEntries(
      SAMPLING_FIELDS.map((field) => [
        field,
        resolveNum(src[field], preset?.[field]),
      ]),
    ),
  );
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

function buildDefaultsForm(
  chatDefaults: StreamOverrides,
  modelMemory: ModelSamplerMemory,
  pendingPreset?: InheritSource | null,
): ConversationOverridesForm {
  // A conversation row only exists after the first send, so before that the
  // drawer showed defaults while seedConversation was already binding the
  // selected preset. The values sent and the values displayed disagreed, and
  // users read that as the preset not applying. Layer the pending preset here
  // on the same precedence seedConversation uses: preset over defaults, except
  // maxTokens, which stays sticky unless the preset sets its own.
  const p = pendingPreset ?? {};
  const layered = {
    temperature:
      modelMemory.temperature ?? p.temperature ?? chatDefaults.temperature,
    topP: modelMemory.topP ?? p.topP ?? chatDefaults.topP,
    topK: modelMemory.topK ?? p.topK ?? chatDefaults.topK,
    minP: modelMemory.minP ?? p.minP ?? chatDefaults.minP,
    topA: modelMemory.topA ?? p.topA ?? chatDefaults.topA,
    frequencyPenalty:
      modelMemory.frequencyPenalty ??
      p.frequencyPenalty ??
      chatDefaults.frequencyPenalty,
    presencePenalty:
      modelMemory.presencePenalty ??
      p.presencePenalty ??
      chatDefaults.presencePenalty,
    repetitionPenalty:
      modelMemory.repetitionPenalty ??
      p.repetitionPenalty ??
      chatDefaults.repetitionPenalty,
    maxTokens: modelMemory.maxTokens ?? p.maxTokens ?? chatDefaults.maxTokens,
  };
  return {
    personaId: NONE_VALUE,
    presetId: NONE_VALUE,
    reasoningEffort:
      modelMemory.reasoningEffort ?? chatDefaults.reasoningEffort ?? NONE_VALUE,
    chatMemory: chatDefaults.chatMemory ?? null,
    authorNoteDepth: chatDefaults.authorNoteDepth ?? DEFAULT_AUTHOR_NOTE_DEPTH,
    systemPromptOverride: chatDefaults.systemPromptOverride ?? "",
    authorNote: chatDefaults.authorNote ?? "",
    webSearchEnabled: false,
    webSearchEngine: chatDefaults.webSearchEngine ?? "auto",
    webSearchContextSize: chatDefaults.webSearchContextSize ?? "medium",
    memoryEnabled: false,
    imageEnabled: false,
    utilityModel: NONE_VALUE,
    titleModel: NONE_VALUE,
    titlePrompt: "",
    promptInstruction: "",
    imageModel: NONE_VALUE,
    imagePreview: false,
    useCharAvatarRef: false,
    characterIds: [],
    lorebookIds: [],
    ...samplingValues(layered),
    extraBody: modelMemory.extraBody ?? chatDefaults.extraBody ?? "",
    streamingEnabled: chatDefaults.streamingEnabled ?? null,
    autoScrollStream: chatDefaults.autoScrollStream ?? null,
    showReasoning: chatDefaults.showReasoning ?? null,
  };
}

type ConvSettings = ConversationSettingsProjection;

type ConvBindings = {
  characters: { characterId: string }[];
  lorebooks: { lorebookId: string }[];
};

type InheritSource = {
  streamingEnabled?: boolean | null;
  autoScrollStream?: boolean | null;
  showReasoning?: boolean | null;
} & Partial<
  Record<(typeof SAMPLING_FIELDS)[number] | "chatMemory", number | null>
>;

function resolveBool(
  convValue: boolean | null | undefined,
  presetValue: boolean | null | undefined,
): boolean {
  return convValue ?? presetValue ?? true;
}

function resolveNum(
  convValue: number | null | undefined,
  presetValue: number | null | undefined,
): number | null {
  return convValue ?? presetValue ?? null;
}

function buildSettingsForm(
  settings: ConvSettings,
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
    chatMemory: resolveNum(settings.chatMemory, preset?.chatMemory),
    authorNoteDepth: settings.authorNoteDepth ?? DEFAULT_AUTHOR_NOTE_DEPTH,
    systemPromptOverride: settings.systemPromptOverride ?? "",
    authorNote: settings.authorNote ?? "",
    webSearchEnabled: settings.webSearchEnabled ?? false,
    webSearchEngine: narrowWebSearchEngine(settings.webSearchEngine),
    webSearchContextSize: narrowWebSearchContextSize(
      settings.webSearchContextSize,
    ),
    memoryEnabled: settings.memoryEnabled ?? false,
    imageEnabled: settings.imageEnabled ?? false,
    utilityModel: settings.utilityModel ?? NONE_VALUE,
    titleModel: settings.titleModel ?? NONE_VALUE,
    titlePrompt: settings.titlePrompt ?? "",
    promptInstruction: settings.promptInstruction ?? "",
    imageModel: settings.imageModel ?? NONE_VALUE,
    imagePreview: settings.imagePreview ?? false,
    useCharAvatarRef: settings.useCharAvatarRef ?? false,
    characterIds: bindings.characters.map((c) => c.characterId),
    lorebookIds: bindings.lorebooks.map((l) => l.lorebookId),
    ...resolveSamplingFromPreset(settings, preset),
    extraBody: settings.extraBody ?? "",
    streamingEnabled: resolveBool(
      settings.streamingEnabled,
      preset?.streamingEnabled,
    ),
    autoScrollStream: resolveBool(
      settings.autoScrollStream,
      preset?.autoScrollStream,
    ),
    showReasoning: resolveBool(settings.showReasoning, preset?.showReasoning),
  };
}

export function computeFormValues(args: {
  isDefaultsMode: boolean;
  chatDefaults: StreamOverrides;
  activeModelName: string | null | undefined;
  samplerMemoryByModel: Record<string, ModelSamplerMemory>;
  settings: ConvSettings | null | undefined;
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

export function buildDefaultsOverrides(
  data: ConversationOverridesForm,
): StreamOverrides {
  return {
    reasoningEffort: formReasoningEffortToValue(data.reasoningEffort),
    chatMemory: data.chatMemory,
    systemPromptOverride: data.systemPromptOverride || null,
    authorNote: data.authorNote || null,
    authorNoteDepth: data.authorNoteDepth,
    webSearchEnabled: data.webSearchEnabled,
    webSearchEngine: data.webSearchEngine,
    webSearchContextSize: data.webSearchContextSize,
    ...samplingValues(data),
    extraBody: data.extraBody || null,
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

function numOverrideOrInherit(
  formValue: number | null | undefined,
  _presetValue: number | null | undefined,
): number | null {
  return formValue ?? null;
}

function samplingOverrides(
  data: ConversationOverridesForm,
  preset: InheritSource | null,
): ReturnType<typeof samplingValues> {
  return samplingValues(
    Object.fromEntries(
      SAMPLING_FIELDS.map((field) => [
        field,
        numOverrideOrInherit(data[field], preset?.[field]),
      ]),
    ),
  );
}

export function buildSettingsBody(
  data: ConversationOverridesForm,
  preset: InheritSource | null,
) {
  return {
    chatMemory: numOverrideOrInherit(data.chatMemory, preset?.chatMemory),
    authorNoteDepth: data.authorNoteDepth,
    systemPromptOverride: data.systemPromptOverride || null,
    authorNote: data.authorNote || null,
    personaId: data.personaId === NONE_VALUE ? null : data.personaId,
    presetId: data.presetId === NONE_VALUE ? null : data.presetId,
    reasoningEffort: formReasoningEffortToValue(data.reasoningEffort),
    webSearchEnabled: data.webSearchEnabled,
    webSearchEngine: data.webSearchEngine,
    webSearchContextSize: data.webSearchContextSize,
    memoryEnabled: data.memoryEnabled,
    imageEnabled: data.imageEnabled,
    utilityModel: data.utilityModel === NONE_VALUE ? null : data.utilityModel,
    titleModel: data.titleModel === NONE_VALUE ? null : data.titleModel,
    titlePrompt: data.titlePrompt || null,
    promptInstruction: data.promptInstruction || null,
    imageModel: data.imageModel === NONE_VALUE ? null : data.imageModel,
    imagePreview: data.imagePreview,
    useCharAvatarRef: data.useCharAvatarRef,
    ...samplingOverrides(data, preset),
    extraBody: data.extraBody || null,
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
