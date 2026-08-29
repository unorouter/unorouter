import { parseStringMap, rec } from "@/lib/utils/base";
import {
  DEFAULT_AUTHOR_NOTE_DEPTH,
  DEFAULT_CHAT_MEMORY,
} from "@/lib/config/constants";
import { logger } from "@/lib/utils/logger";
import {
  parseExtraBody as parseExtraBodyShared,
  type StreamOverrides,
} from "@/lib/validation/chat";
import type { LoadedConvContext } from "@/lib/types";
import { countTokens } from "@/lib/ai/chat/tokenizer";
import { keyHits, selectLorebookEntries } from "./lorebook";
import { parseExampleMessages } from "./example-messages";
import { expandMacros, type MacroScope } from "@/lib/ai/chat/macros";
import {
  DEFAULT_PROMPT_TEMPLATE,
  parsePromptTemplate,
  walkTemplate,
  type PromptPart,
  type SlotBlock,
  type TemplateSlots,
} from "./template";

export type DepthInjection = {
  text: string;
  depth: number;
  role?: "system" | "user" | "assistant";
};

type SamplingSource = {
  temperature?: number | null;
  topP?: number | null;
  topK?: number | null;
  minP?: number | null;
  topA?: number | null;
  frequencyPenalty?: number | null;
  presencePenalty?: number | null;
  repetitionPenalty?: number | null;
  maxTokens?: number | null;
};

const SAMPLING_FIELD_MAP = [
  ["temperature", "temperature"],
  ["topP", "topP"],
  ["topK", "topK"],
  ["minP", "minP"],
  ["topA", "topA"],
  ["frequencyPenalty", "frequencyPenalty"],
  ["presencePenalty", "presencePenalty"],
  ["repetitionPenalty", "repetitionPenalty"],
  ["maxTokens", "maxOutputTokens"],
] as const satisfies readonly (readonly [
  keyof SamplingSource,
  keyof AssembledSystem["sampling"],
])[];

function mergeSampling(
  dest: AssembledSystem["sampling"],
  src: SamplingSource | null | undefined,
): void {
  if (!src) return;
  for (const [from, to] of SAMPLING_FIELD_MAP) {
    const v = src[from];
    if (v != null) dest[to] = v;
  }
}

export type AssembledSystem = {
  system: string | undefined;
  sampling: {
    temperature?: number;
    topP?: number;
    topK?: number;
    minP?: number;
    topA?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    repetitionPenalty?: number;
    maxOutputTokens?: number;
  };
  reasoningEffort?: string;
  chatMemory: number;
  streamingEnabled: boolean;
  authorNote?: DepthInjection;
  extraBody?: Record<string, unknown>;
  providerRouting?: ProviderRouting;
  prefill?: string;
  promptParts: PromptPart[];
  promptTokens: number;
  vars: MacroScope;
  flags: {
    forceAlternateRoles: boolean;
    noSystemRole: boolean;
    mustStartWithUserInput: boolean;
    geminiBlockOff: boolean;
  };
};

function parseExtraBody(
  raw: string | null | undefined,
): Record<string, unknown> | undefined {
  const r = parseExtraBodyShared(raw);
  return r.state === "valid" ? r.parsed : undefined;
}

const CHAR_OVERRIDE_FIELDS = [
  "name",
  "description",
  "personality",
  "scenario",
  "exampleMessages",
  "systemPrompt",
  "postHistoryInstructions",
];

function applyCharOverrides<T extends Record<string, unknown>>(
  character: T,
  overrides: unknown,
): T {
  const ov = rec(overrides);
  if (!ov) return character;
  const merged: Record<string, unknown> = { ...character };
  for (const f of CHAR_OVERRIDE_FIELDS) {
    if (ov[f] != null) merged[f] = ov[f];
  }
  return merged as T;
}

const PROVIDER_ROUTING_LIST_KEYS: readonly ("order" | "only" | "ignore")[] = [
  "order",
  "only",
  "ignore",
];

type ProviderRouting = {
  order?: string[];
  only?: string[];
  ignore?: string[];
  sort?: string;
};

function parseProviderRouting(
  raw: string | null | undefined,
): ProviderRouting | undefined {
  if (!raw) return undefined;
  try {
    const src = rec(JSON.parse(raw));
    if (!src) return undefined;
    const out: ProviderRouting = {};
    for (const k of PROVIDER_ROUTING_LIST_KEYS) {
      const v = src[k];
      if (Array.isArray(v) && v.length > 0) out[k] = v.map(String);
    }
    if (typeof src.sort === "string" && src.sort) out.sort = src.sort;
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

function baseAssembled(system: string | undefined): AssembledSystem {
  return {
    system,
    sampling: {},
    chatMemory: DEFAULT_CHAT_MEMORY,
    streamingEnabled: true,
    promptTokens: 0,
    promptParts: [
      ...(system
        ? [
            {
              kind: "message",
              role: "system",
              text: system,
            } satisfies PromptPart,
          ]
        : []),
      { kind: "chatHistory", rangeStart: -1000, rangeEnd: "end" },
    ],
    vars: {
      user: "User",
      char: "Assistant",
      user_description: "",
      char_description: "",
      scenario: "",
      personality: "",
      vars: {},
    },
    flags: {
      forceAlternateRoles: false,
      noSystemRole: false,
      mustStartWithUserInput: false,
      geminiBlockOff: false,
    },
  };
}

export function assembleFromOverrides(
  overrides: StreamOverrides | undefined,
  fallbackSystemMessage: string | undefined,
): AssembledSystem {
  const sampling: AssembledSystem["sampling"] = {};
  mergeSampling(sampling, overrides);
  const sections: string[] = [];
  if (fallbackSystemMessage) sections.push(fallbackSystemMessage);
  if (overrides?.systemPromptOverride)
    sections.push(overrides.systemPromptOverride);
  const authorNote = overrides?.authorNote
    ? {
        text: overrides.authorNote,
        depth: overrides.authorNoteDepth ?? DEFAULT_AUTHOR_NOTE_DEPTH,
      }
    : undefined;
  const overridesSystem = sections.length ? sections.join("\n\n") : undefined;
  return {
    ...baseAssembled(overridesSystem),
    sampling,
    reasoningEffort: overrides?.reasoningEffort ?? undefined,
    chatMemory: overrides?.chatMemory ?? DEFAULT_CHAT_MEMORY,
    streamingEnabled: overrides?.streamingEnabled ?? true,
    authorNote,
    extraBody: parseExtraBody(overrides?.extraBody),
  };
}

export type AssembleOpts = {
  globalVars?: string | null;
  history?: {
    role: "user" | "assistant" | "system";
    text: string;
    time?: number;
  }[];
  seedVars?: Record<string, string>;
  model?: string;
  maxContext?: number;
  speakingCharacterId?: string;
  clientEnv?: {
    viewportW?: number;
    viewportH?: number;
    locale?: string;
    timeZone?: string;
  };
  prefillSupported?: boolean;
};

export async function assembleForStream(
  convId: string,
  recentUserTexts: string[],
  fallbackSystemMessage: string | undefined,
  preloadedCtx: LoadedConvContext,
  opts?: AssembleOpts,
): Promise<AssembledSystem> {
  const globalVars = opts?.globalVars;
  const history = opts?.history;
  const ctx = preloadedCtx;
  if (!ctx) return baseAssembled(fallbackSystemMessage);

  const { settings, persona, preset, lbRows, lbEntries } = ctx;

  let boundCharacters = ctx.boundCharacters;
  if (opts?.speakingCharacterId) {
    const idx = boundCharacters.findIndex(
      (b) => b.binding.characterId === opts.speakingCharacterId,
    );
    if (idx > 0) {
      boundCharacters = [
        boundCharacters[idx],
        ...boundCharacters.slice(0, idx),
        ...boundCharacters.slice(idx + 1),
      ];
    }
  }

  const primary = boundCharacters[0]?.character;
  const userName = persona?.name ?? "User";
  const charName = primary?.name ?? "Assistant";
  const userDesc = persona?.description ?? "";
  const charDesc = primary?.description ?? "";
  const scenario = primary?.scenario ?? "";

  const macroScope: MacroScope = {
    user: userName,
    char: charName,
    user_description: userDesc,
    char_description: charDesc,
    scenario,
    personality: primary?.personality ?? "",
    vars: opts?.seedVars ?? parseStringMap(settings.vars),
    globalVars: parseStringMap(globalVars),
    tempVars: {},
    history,
    seed: `${convId}:${history?.length ?? 0}`,
    model: opts?.model ?? settings.defaultModel ?? undefined,
    maxContext: opts?.maxContext,
    mainPrompt: preset?.mainPrompt ?? undefined,
    jailbreak: preset?.postHistory ?? undefined,
    globalNote:
      settings.systemPromptOverride ?? primary?.systemPrompt ?? undefined,
    prefill: preset?.prefill ?? undefined,
    authorNote: settings.authorNote ?? undefined,
    viewport:
      opts?.clientEnv?.viewportW != null && opts?.clientEnv?.viewportH != null
        ? { w: opts.clientEnv.viewportW, h: opts.clientEnv.viewportH }
        : undefined,
    locale: opts?.clientEnv?.locale,
    timeZone: opts?.clientEnv?.timeZone,
    firstMessage: primary?.firstMessage ?? undefined,
    alternateGreetings: primary?.alternateGreetings ?? undefined,
    fmIndex: settings.firstMsgIndex ?? -1,
    exampleMessage: primary?.exampleMessages ?? undefined,
    lorebooks: lbEntries,
    prefillSupported: opts?.prefillSupported,
  };
  const expand = (text: string | null | undefined) =>
    text ? expandMacros(text, macroScope) : "";

  const booksById = new Map(lbRows.map((b) => [b.id, b]));
  const scanTexts = history
    ? history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => m.text)
        .reverse()
    : recentUserTexts;
  const selected = selectLorebookEntries(scanTexts, lbEntries, booksById, {
    chatLength: history?.length ?? recentUserTexts.length,
    greetingIndex: (macroScope.fmIndex ?? -1) + 1,
    vars: macroScope.vars,
    seed: macroScope.seed,
  });

  const joinNonEmpty = (parts: string[]) =>
    parts.filter(Boolean).join("\n\n").trim();

  const mainSlot = joinNonEmpty([
    expand(preset?.mainPrompt),
    fallbackSystemMessage ?? "",
  ]);

  const lorebookBlocks = selected
    .map((e) => ({
      text: expand(e.content),
      role: e.injectionRole ?? "system",
    }))
    .filter((b) => b.text.trim().length > 0);

  const charScanText = recentUserTexts.join("\n");
  const charBlocks: string[] = [];
  for (let i = 0; i < boundCharacters.length; i++) {
    const binding = boundCharacters[i];
    const ch = applyCharOverrides(binding.character, binding.binding.overrides);
    const isPrimary = i === 0;
    const turnTriggers = ch.turnTriggers ?? null;
    const gated =
      !isPrimary &&
      ch.alwaysActive === false &&
      Array.isArray(turnTriggers) &&
      turnTriggers.length > 0;
    if (gated) {
      const hit = turnTriggers.some((k) =>
        keyHits(k, charScanText, !!ch.matchWholeWords),
      );
      if (!hit) continue;
    }
    const charBlock: string[] = [];
    if (ch.description) {
      charBlock.push(`# ${ch.name}\n\n${expand(ch.description)}`);
    } else if (ch.name) {
      charBlock.push(`# ${ch.name}`);
    }
    if (ch.personality)
      charBlock.push(`## Personality\n${expand(ch.personality)}`);
    if (ch.scenario) charBlock.push(`## Scenario\n${expand(ch.scenario)}`);
    if (charBlock.length > 0) charBlocks.push(charBlock.join("\n\n"));
  }
  const descriptionSlot = joinNonEmpty(charBlocks);

  const personaSlot = persona
    ? joinNonEmpty([
        `# User persona: ${persona.name}`,
        expand(persona.description),
      ])
    : "";

  const sysOverride =
    settings.systemPromptOverride ?? primary?.systemPrompt ?? null;
  const systemPromptSlot = sysOverride ? expand(sysOverride) : "";

  const postHistorySlot = joinNonEmpty([
    expand(primary?.postHistoryInstructions),
    expand(preset?.postHistory),
  ]);

  const sys = (text: string): SlotBlock | null =>
    text ? { text, role: "system" } : null;
  const prefillText = preset?.prefill ? expand(preset.prefill) : "";
  const slots: TemplateSlots = {
    main: sys(mainSlot),
    lorebook: lorebookBlocks,
    description: sys(descriptionSlot),
    persona: sys(personaSlot),
    systemPrompt: sys(systemPromptSlot),
    prefill: prefillText ? { text: prefillText, role: "assistant" } : null,
    postHistory: postHistorySlot
      ? {
          text: postHistorySlot,
          role: preset?.postHistoryRole === "user" ? "user" : "system",
        }
      : null,
  };

  const template =
    parsePromptTemplate(preset?.promptTemplate) ?? DEFAULT_PROMPT_TEMPLATE;
  const promptParts = walkTemplate(template, slots);

  const exampleTurns = parseExampleMessages(
    primary?.exampleMessages,
    charName,
  ).map((t): PromptPart => ({
    kind: "message",
    role: t.role,
    text: expand(t.text),
  }));
  if (exampleTurns.length > 0) {
    const histIdx = promptParts.findIndex((p) => p.kind === "chatHistory");
    const at = histIdx === -1 ? promptParts.length : histIdx;
    promptParts.splice(at, 0, ...exampleTurns);
  }

  const leadSystem: string[] = [];
  for (const p of promptParts) {
    if (p.kind === "message" && p.role === "system") leadSystem.push(p.text);
    else break;
  }
  const system = joinNonEmpty(leadSystem) || fallbackSystemMessage;

  const authorNote = settings.authorNote
    ? {
        text: expand(settings.authorNote),
        depth: settings.authorNoteDepth ?? DEFAULT_AUTHOR_NOTE_DEPTH,
      }
    : undefined;

  const sampling: AssembledSystem["sampling"] = {};
  mergeSampling(sampling, preset);
  mergeSampling(sampling, settings);

  const extraBody =
    parseExtraBody(settings.extraBody) ?? parseExtraBody(preset?.extraBody);

  const reasoningEffort =
    settings.reasoningEffort ??
    preset?.reasoningEffort ??
    primary?.defaultReasoningEffort ??
    undefined;

  logger.debug("Stream prompt assembled", {
    context: "stream.assembler",
    convId,
    hasCharacter: !!primary,
    hasPersona: !!persona,
    hasPreset: !!preset,
    lorebookEntries: selected.length,
    chatMemory: settings.chatMemory,
  });

  return {
    system: system || undefined,
    sampling,
    reasoningEffort: reasoningEffort ?? undefined,
    chatMemory:
      settings.chatMemory ?? preset?.chatMemory ?? DEFAULT_CHAT_MEMORY,
    streamingEnabled:
      settings.streamingEnabled ?? preset?.streamingEnabled ?? true,
    authorNote,
    extraBody,
    providerRouting: parseProviderRouting(preset?.providers),
    prefill: prefillText || undefined,
    promptParts,
    promptTokens: estimatePromptTokens(promptParts, authorNote),
    vars: macroScope,
    flags: {
      forceAlternateRoles: preset?.forceAlternateRoles ?? false,
      noSystemRole: preset?.noSystemRole ?? false,
      mustStartWithUserInput: preset?.mustStartWithUserInput ?? false,
      geminiBlockOff: preset?.geminiBlockOff ?? false,
    },
  };
}

function estimatePromptTokens(
  parts: PromptPart[],
  authorNote: DepthInjection | undefined,
): number {
  let total = 0;
  for (const p of parts) if (p.kind === "message") total += countTokens(p.text);
  if (authorNote) total += countTokens(authorNote.text);
  return total;
}
