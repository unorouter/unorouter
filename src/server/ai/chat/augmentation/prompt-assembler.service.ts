import { parseStringMap } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import {
  parseExtraBody as parseExtraBodyShared,
  type StreamOverrides,
} from "@/lib/validation/chat";
import type { LoadedConvContext } from "@/lib/types";
import { encode } from "gpt-tokenizer";
import { keyHits, selectLorebookEntries } from "./prompt-assembler/lorebook";
import { parseExampleMessages } from "./example-messages";
import { expandMacros, type MacroScope } from "@/lib/ai/chat/macros";
import {
  DEFAULT_PROMPT_TEMPLATE,
  parsePromptTemplate,
  walkTemplate,
  type PromptPart,
  type TemplateSlots,
} from "./prompt-template";

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
  atDepthEntries: DepthInjection[];
  /** Parsed extra body merged into providerOptions. Sliders win on key clash. */
  extraBody?: Record<string, unknown>;
  /** OpenRouter-style provider routing, passed through the request body. */
  providerRouting?: ProviderRouting;
  prefill?: string;
  /** Ordered template parts; the `chatHistory` part marks where messages splice in. */
  promptParts: PromptPart[];
  /** Non-history prompt token estimate, reserved against the context window. */
  promptTokens: number;
  /** Shared macro scope; threaded into message expansion so var writes persist. */
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
] as const;

// Binding overrides win over stored character fields; nullish values fall through.
function applyCharOverrides<T extends Record<string, unknown>>(
  character: T,
  overrides: unknown,
): T {
  if (!overrides || typeof overrides !== "object") return character;
  const ov = overrides as Record<string, unknown>;
  const merged = { ...character };
  for (const f of CHAR_OVERRIDE_FIELDS) {
    if (ov[f] != null) (merged as Record<string, unknown>)[f] = ov[f];
  }
  return merged;
}

type ProviderRouting = {
  order?: string[];
  only?: string[];
  ignore?: string[];
  sort?: string;
};

// JSON string `{order?,only?,ignore?,sort?}` (OpenRouter shape); passed through
// verbatim, no-op on channels that don't route on it.
function parseProviderRouting(
  raw: string | null | undefined,
): ProviderRouting | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const src = parsed as Record<string, unknown>;
    const out: ProviderRouting = {};
    for (const k of ["order", "only", "ignore"] as const) {
      const v = src[k];
      if (Array.isArray(v) && v.length > 0) out[k] = v.map(String);
    }
    if (typeof src.sort === "string" && src.sort) out.sort = src.sort;
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

// Minimal AssembledSystem, shared by the overrides path and missing-context fallback.
function baseAssembled(system: string | undefined): AssembledSystem {
  return {
    system,
    sampling: {},
    chatMemory: 8,
    streamingEnabled: true,
    atDepthEntries: [],
    promptTokens: 0,
    promptParts: [
      ...(system
        ? [{ kind: "message" as const, role: "system" as const, text: system }]
        : []),
      {
        kind: "chatHistory" as const,
        rangeStart: -1000,
        rangeEnd: "end" as const,
      },
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
    ? { text: overrides.authorNote, depth: overrides.authorNoteDepth ?? 4 }
    : undefined;
  const overridesSystem = sections.length ? sections.join("\n\n") : undefined;
  return {
    ...baseAssembled(overridesSystem),
    sampling,
    reasoningEffort: overrides?.reasoningEffort ?? undefined,
    // 0 default silently disabled chat memory for guests.
    chatMemory: overrides?.chatMemory ?? 8,
    streamingEnabled: overrides?.streamingEnabled ?? true,
    authorNote,
    extraBody: parseExtraBody(overrides?.extraBody),
  };
}

export type AssembleOpts = {
  // Per-user global var store (JSON string); mutated by setglobalvar, caller persists.
  globalVars?: string | null;
  // Role-tagged recent history (newest last) for the {{history}} macros.
  history?: {
    role: "user" | "assistant" | "system";
    text: string;
    time?: number;
  }[];
  // Pre-mutated chat var store (start triggers); used over settings.vars so
  // trigger writes are visible to the prompt + writeback.
  seedVars?: Record<string, string>;
  model?: string;
  maxContext?: number;
  // Multi-character rotation: promote this bound character to primary ({{char}}) this turn.
  speakingCharacterId?: string;
  // Browser env for screen_width/height + locale-faithful time macros.
  clientEnv?: {
    viewportW?: number;
    viewportH?: number;
    locale?: string;
    timeZone?: string;
  };
  // Model supports assistant prefill ({{prefill_supported}}).
  prefillSupported?: boolean;
};

export async function assembleForStream(
  convId: string,
  recentUserTexts: string[],
  fallbackSystemMessage: string | undefined,
  // Required: the caller owns the ownership-scoped context load. A fallback
  // load here would re-resolve convId without the caller's userId,
  // reintroducing the cross-user context read this guards against.
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

  // `vars` is mutated in place across expand() calls so writes are visible to
  // later reads; persisted by the caller after the stream.
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
    // Per-turn seed: stable across regenerates, re-rolls next turn (convId alone would freeze rolls forever).
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
    alternateGreetings: Array.isArray(primary?.alternateGreetings)
      ? (primary.alternateGreetings as string[])
      : undefined,
    fmIndex:
      (settings as { firstMsgIndex?: number | null }).firstMsgIndex ?? -1,
    exampleMessage: primary?.exampleMessages ?? undefined,
    lorebooks: lbEntries,
    prefillSupported: opts?.prefillSupported,
  };
  const expand = (text: string | null | undefined) =>
    text ? expandMacros(text, macroScope) : "";

  const booksById = new Map(lbRows.map((b) => [b.id, b]));
  // Lore scans user AND assistant messages (Risu searchMatch); newest first for slice(0, scanDepth).
  const scanTexts = history
    ? history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => m.text)
        .reverse()
    : recentUserTexts;
  const selected = selectLorebookEntries(scanTexts, lbEntries, booksById, {
    // Drives @@activate_only_after/every gates.
    chatLength: history?.length ?? recentUserTexts.length,
    // Risu gate: @@is_greeting N matches fmIndex+1 (0 = default firstMessage).
    greetingIndex: (macroScope.fmIndex ?? -1) + 1,
    vars: macroScope.vars,
    // Same per-turn seed as macros: @@probability stable across regenerates.
    seed: macroScope.seed,
  });

  // Named content slots ordered by the prompt template; the default template
  // keeps the no-template path byte-identical.
  const joinNonEmpty = (parts: string[]) =>
    parts.filter(Boolean).join("\n\n").trim();

  const mainSlot = joinNonEmpty([
    expand(preset?.mainPrompt),
    fallbackSystemMessage ?? "",
  ]);

  const loreAt = (pos: string) =>
    joinNonEmpty(
      selected.filter((x) => x.position === pos).map((e) => expand(e.content)),
    );

  // Multi-char: primary owns {{char}}; non-primary alwaysActive=false is trigger-gated.
  const charScanText = recentUserTexts.join("\n");
  const charBlocks: string[] = [];
  for (let i = 0; i < boundCharacters.length; i++) {
    const binding = boundCharacters[i];
    const ch = applyCharOverrides(binding.character, binding.binding.overrides);
    const isPrimary = i === 0;
    const turnTriggers = (ch.turnTriggers ?? null) as string[] | null;
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
    // exampleMessages emit as few-shot turns below, intentionally not pushed here.
    if (charBlock.length > 0) charBlocks.push(charBlock.join("\n\n"));
  }
  const descriptionSlot = joinNonEmpty(charBlocks);

  const personaSlot = persona
    ? joinNonEmpty([
        `# User persona: ${persona.name}`,
        expand(persona.description),
      ])
    : "";

  // ST parity: only primary's systemPrompt emits in the main system block.
  const sysOverride =
    settings.systemPromptOverride ?? primary?.systemPrompt ?? null;
  const systemPromptSlot = sysOverride ? expand(sysOverride) : "";

  const postHistorySlot = joinNonEmpty([
    expand(primary?.postHistoryInstructions),
    expand(preset?.postHistory),
    loreAt("bottom"),
  ]);

  // Empty slot text -> null so the template walk skips the card.
  const sys = (text: string) =>
    text ? { text, role: "system" as const } : null;
  const prefillText = preset?.prefill ? expand(preset.prefill) : "";
  const slots: TemplateSlots = {
    main: sys(mainSlot),
    loreTop: sys(loreAt("top")),
    loreBeforeChar: sys(loreAt("before_char")),
    description: sys(descriptionSlot),
    persona: sys(personaSlot),
    loreAfterChar: sys(loreAt("after_char")),
    systemPrompt: sys(systemPromptSlot),
    // Prefill rides the template as a trailing assistant message so it orders
    // with the stack (default: after chat, before postHistory end inject).
    prefill: prefillText ? { text: prefillText, role: "assistant" as const } : null,
    postHistory: sys(postHistorySlot),
  };

  const template =
    parsePromptTemplate(preset?.promptTemplate) ?? DEFAULT_PROMPT_TEMPLATE;
  const promptParts = walkTemplate(template, slots);

  // Example dialogue as role-tagged few-shot turns spliced before chat history (RisuAI exampleMessage).
  const exampleTurns = parseExampleMessages(
    primary?.exampleMessages,
    charName,
  ).map((t) => ({
    kind: "message" as const,
    role: t.role,
    text: expand(t.text),
  }));
  if (exampleTurns.length > 0) {
    const histIdx = promptParts.findIndex((p) => p.kind === "chatHistory");
    const at = histIdx === -1 ? promptParts.length : histIdx;
    promptParts.splice(at, 0, ...exampleTurns);
  }

  // `system` = leading run of system messages only (what the stream hoists);
  // later parts are emitted inline and must not be duplicated here.
  const leadSystem: string[] = [];
  for (const p of promptParts) {
    if (p.kind === "message" && p.role === "system") leadSystem.push(p.text);
    else break;
  }
  const system = joinNonEmpty(leadSystem) || fallbackSystemMessage;

  const atDepthEntries: DepthInjection[] = selected
    .filter((e) => e.position === "at_depth")
    .map((e) => ({
      text: expand(e.content),
      depth: e.depth ?? 4,
      // Role passes through verbatim; default system (RisuAI/ST).
      role: e.injectionRole ?? "system",
    }));
  const authorNote = settings.authorNote
    ? {
        text: expand(settings.authorNote),
        depth: settings.authorNoteDepth ?? 4,
      }
    : undefined;

  const sampling: AssembledSystem["sampling"] = {};
  mergeSampling(sampling, preset);
  mergeSampling(sampling, settings);

  const extraBody =
    parseExtraBody(settings.extraBody) ?? parseExtraBody(preset?.extraBody);

  const reasoningEffort =
    settings.reasoningEffort ?? primary?.defaultReasoningEffort ?? undefined;

  logger.debug("Stream prompt assembled", {
    context: "stream.assembler",
    convId,
    hasCharacter: !!primary,
    hasPersona: !!persona,
    hasPreset: !!preset,
    lorebookEntries: selected.length,
    atDepthEntries: atDepthEntries.length,
    chatMemory: settings.chatMemory,
  });

  return {
    system: system || undefined,
    sampling,
    reasoningEffort: reasoningEffort ?? undefined,
    // Precedence: conv override -> preset -> default; null conv = inherit preset.
    chatMemory: settings.chatMemory ?? preset?.chatMemory ?? 8,
    streamingEnabled:
      settings.streamingEnabled ?? preset?.streamingEnabled ?? true,
    authorNote,
    atDepthEntries,
    extraBody,
    providerRouting: parseProviderRouting(preset?.providers),
    // Emitted as a `prefill` slot in promptParts; kept here for the GLM
    // end-stub suppression flag and the no-prefill-card template fallback.
    prefill: prefillText || undefined,
    promptParts,
    promptTokens: estimatePromptTokens(promptParts, atDepthEntries, authorNote),
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
  atDepth: DepthInjection[],
  authorNote: DepthInjection | undefined,
): number {
  const est = (t: string) => (t ? encode(t).length : 0);
  let total = 0;
  for (const p of parts) if (p.kind === "message") total += est(p.text);
  for (const d of atDepth) total += est(d.text);
  if (authorNote) total += est(authorNote.text);
  return total;
}
