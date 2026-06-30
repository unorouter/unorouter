import { msg, NONE_VALUE, type TranslationKey } from "@/lib/config/constants";
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

// `none` is a runtime-only sentinel handled by the picker's leadingOptions.
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

// Sampler display values resolved against the bound preset (conv -> preset -> null),
// so a preset-bound chat's sliders show the preset's values instead of blanks.
function resolveSamplingFromPreset(
  src: SamplerSource,
  preset: InheritSource | null,
): ReturnType<typeof samplingValues> {
  const out = {} as ReturnType<typeof samplingValues>;
  for (const field of SAMPLING_FIELDS) {
    out[field] = resolveNum(src[field], preset?.[field]);
  }
  return out;
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

// Defaults mode: chat-defaults atom layered with the model's remembered sampler values.
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
    // null = inherit the bound preset (no per-chat override).
    chatMemory: chatDefaults.chatMemory ?? null,
    authorNoteDepth: chatDefaults.authorNoteDepth ?? 4,
    systemPromptOverride: chatDefaults.systemPromptOverride ?? "",
    authorNote: chatDefaults.authorNote ?? "",
    webSearchEnabled: false,
    webSearchEngine: chatDefaults.webSearchEngine ?? "auto",
    webSearchContextSize: chatDefaults.webSearchContextSize ?? "medium",
    memoryEnabled: false,
    imageEnabled: false,
    utilityModel: NONE_VALUE,
    promptInstruction: "",
    characterIds: [],
    lorebookIds: [],
    ...samplingValues(layered),
    extraBody: modelMemory.extraBody ?? chatDefaults.extraBody ?? "",
    streamingEnabled: chatDefaults.streamingEnabled ?? null,
    showReasoning: chatDefaults.showReasoning ?? null,
  };
}

type ConvSettings = ConversationSettingsProjection;

type ConvBindings = {
  characters: { characterId: string }[];
  lorebooks: { lorebookId: string }[];
};

// Inherited values resolve conv override -> preset; the drawer shows the effective
// (inherited) value so a preset-bound chat reads its preset, not a blank default.
// Booleans also fall back to true; sampling/chatMemory stay null (= system default).
type InheritSource = {
  streamingEnabled?: boolean | null;
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

// Sampler/chatMemory inherit chain for DISPLAY: conv override, else preset, else null.
function resolveNum(
  convValue: number | null | undefined,
  presetValue: number | null | undefined,
): number | null {
  return convValue ?? presetValue ?? null;
}

// Conv mode: seed form from persisted settings + bindings; narrow text columns.
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
    // Inherited from the bound preset for display; null conv value shows the preset's.
    chatMemory: resolveNum(settings.chatMemory, preset?.chatMemory),
    authorNoteDepth: settings.authorNoteDepth ?? 4,
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
    promptInstruction: settings.promptInstruction ?? "",
    characterIds: bindings.characters.map((c) => c.characterId),
    lorebookIds: bindings.lorebooks.map((l) => l.lorebookId),
    ...resolveSamplingFromPreset(settings, preset),
    extraBody: settings.extraBody ?? "",
    streamingEnabled: resolveBool(
      settings.streamingEnabled,
      preset?.streamingEnabled,
    ),
    showReasoning: resolveBool(settings.showReasoning, preset?.showReasoning),
  };
}

// Seed by mode: defaults atom or persisted conv rows. Undefined while loading = RHF keeps current.
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
    return buildDefaultsForm(args.chatDefaults, memory);
  }
  if (!args.settings || !args.bindings) return undefined;
  return buildSettingsForm(args.settings, args.bindings, args.preset);
}

// Defaults mode submit payload: the StreamOverrides written to the atom.
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
    showReasoning: data.showReasoning,
  };
}

// null (inherit live preset) when the value still matches the inherited one, else explicit override.
function overrideOrInherit(
  formValue: boolean | null | undefined,
  presetValue: boolean | null | undefined,
): boolean | null {
  if (formValue == null) return null;
  const inherited = presetValue ?? true;
  return formValue === inherited ? null : formValue;
}

// A set sampler slider persists its EXPLICIT value (so it survives refresh + later preset edits); only a
// genuinely-unset (null) slider stores null = inherit the preset. Previously a value matching the preset
// collapsed to null, which made maxTokens "default" on refresh when the preset later differed/unbound.
// presetValue is unused now but kept in the signature so call sites (samplingOverrides) stay uniform.
function numOverrideOrInherit(
  formValue: number | null | undefined,
  _presetValue: number | null | undefined,
): number | null {
  return formValue ?? null;
}

// Sampler save payload: each field null when it still matches the inherited preset.
function samplingOverrides(
  data: ConversationOverridesForm,
  preset: InheritSource | null,
): ReturnType<typeof samplingValues> {
  const out = {} as ReturnType<typeof samplingValues>;
  for (const field of SAMPLING_FIELDS) {
    out[field] = numOverrideOrInherit(data[field], preset?.[field]);
  }
  return out;
}

// Conversation mode submit payload: the conversation_settings update body.
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
    promptInstruction: data.promptInstruction || null,
    ...samplingOverrides(data, preset),
    extraBody: data.extraBody || null,
    streamingEnabled: overrideOrInherit(
      data.streamingEnabled,
      preset?.streamingEnabled,
    ),
    showReasoning: overrideOrInherit(data.showReasoning, preset?.showReasoning),
  };
}

// Form owns membership + order; isActive/overrides preserved from existing rows.
type ExistingCharBinding = Pick<
  typeof conversationCharacters.$inferSelect,
  "characterId" | "isActive" | "overrides"
>;

export function buildBindingsBody(
  data: ConversationOverridesForm,
  existing?: { characters: ExistingCharBinding[] } | null,
) {
  const existingByCharId = new Map(
    (existing?.characters ?? []).map((c) => [c.characterId, c] as const),
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
