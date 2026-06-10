import { parseStringMap } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import {
  parseExtraBody as parseExtraBodyShared,
  type StreamOverrides,
} from "@/lib/validation/chat";
import { loadConvContext } from "./prompt-assembler/conv-context";
import type { LoadedConvContext } from "@/lib/types";
import { encode } from "gpt-tokenizer";
import { keyHits, selectLorebookEntries } from "./prompt-assembler/lorebook";
import { parseExampleMessages } from "./example-messages";
import { expandMacros, type MacroScope } from "./macros";
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

// Source field -> sampling field; maxTokens is the one rename.
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
  /** Post-history block (jailbreak/postHistory + bottom lore), emitted AFTER
   *  chat history so the model reads it last (RisuAI postEverything parity). */
  postHistory?: string;
  /** Ordered prompt parts from the template walk. The `chatHistory` part marks
   *  where conversation messages splice in. Stream service flattens these. */
  promptParts: PromptPart[];
  /** Two-pass token estimate of the non-history prompt (system + pre/post-chat
   *  parts + depth/author injections). The stream service reserves this against
   *  the context window before fitting chat history to the budget. */
  promptTokens: number;
  /** Shared macro scope (field tokens + the live chat-variable store). Threaded
   *  into message-body expansion so var writes persist across the whole prompt. */
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

// Prompt-affecting character fields a per-conversation binding may override.
const CHAR_OVERRIDE_FIELDS = [
  "name",
  "description",
  "personality",
  "scenario",
  "exampleMessages",
  "systemPrompt",
  "postHistoryInstructions",
] as const;

// Merge a binding's overrides (JSON column, loose shape) over the stored
// character. Only the prompt-affecting fields are honored; nullish override
// values fall through to the stored value.
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

// Provider routing is stored as a JSON string `{order?,only?,ignore?,sort?}`
// (OpenRouter shape). Passed through the request body verbatim; only honored by
// upstream channels that route on it (OpenRouter-backed), a no-op otherwise.
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

// Minimal AssembledSystem: a system-only prompt + the whole chat history.
// Shared by the overrides path and the missing-context fallback.
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
  // Per-user global variable store (JSON string), persisted via the userVars
  // sync kind. Mutated by setglobalvar macros; caller persists if changed.
  globalVars?: string | null;
  // Role-tagged recent chat history (newest last) for the {{history}} macros.
  history?: { role: "user" | "assistant" | "system"; text: string }[];
  // Pre-mutated chat var store (e.g. by start-mode triggers). When given, this
  // map is used directly (and mutated further by macros) instead of re-parsing
  // settings.vars, so trigger var writes are visible to the prompt + writeback.
  seedVars?: Record<string, string>;
  // Model id + context window for the {{model}}/{{maxcontext}} field tokens.
  model?: string;
  maxContext?: number;
  // Multi-character rotation: promote this bound character to primary so it
  // drives {{char}} and the per-character block ordering for this turn.
  speakingCharacterId?: string;
};

export async function assembleForStream(
  convId: string,
  recentUserTexts: string[],
  fallbackSystemMessage?: string,
  preloadedCtx?: LoadedConvContext,
  opts?: AssembleOpts,
): Promise<AssembledSystem> {
  const globalVars = opts?.globalVars;
  const history = opts?.history;
  const ctx = preloadedCtx ?? (await loadConvContext(convId));
  if (!ctx) return baseAssembled(fallbackSystemMessage);

  const { settings, persona, preset, lbRows, lbEntries } = ctx;

  // Multi-character rotation: float the speaking character to index 0 so it
  // becomes primary ({{char}} + first character block) for this turn.
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

  // Shared macro scope. `vars` is the per-conversation chat-variable store;
  // setvar/addvar mutate it in place across every expand() call so writes are
  // visible to later reads. Persisted by the caller after the stream.
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
    // Per-TURN seed (convId + chat length): roll/random/pick are stable across
    // regenerates of the same turn but re-roll on the next turn. convId alone
    // would freeze every {{roll}} for the conversation's lifetime.
    seed: `${convId}:${history?.length ?? 0}`,
    // Prompt-field tokens ({{model}}, {{jailbreak}}, {{main_prompt}}, ...).
    model: opts?.model ?? settings.defaultModel ?? undefined,
    maxContext: opts?.maxContext,
    mainPrompt: preset?.mainPrompt ?? undefined,
    jailbreak: preset?.postHistory ?? undefined,
    globalNote:
      settings.systemPromptOverride ?? primary?.systemPrompt ?? undefined,
    prefill: preset?.prefill ?? undefined,
    authorNote: settings.authorNote ?? undefined,
  };
  const expand = (text: string | null | undefined) =>
    text ? expandMacros(text, macroScope) : "";

  const booksById = new Map(lbRows.map((b) => [b.id, b]));
  // Lore scans BOTH user and assistant messages (Risu searchMatch scans the
  // whole chat window): what the bot said must be able to activate entries.
  // Newest first to match the selector's slice(0, scanDepth).
  const scanTexts = history
    ? history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => m.text)
        .reverse()
    : recentUserTexts;
  const selected = selectLorebookEntries(scanTexts, lbEntries, booksById, {
    // Chat length drives the @@activate_only_after/every gates; sticky-match
    // state reads/writes the (now-persisted) conversation var store.
    chatLength: history?.length ?? recentUserTexts.length,
    // 0 = default greeting (Risu fmIndex -1 + 1); alternate greetings are not
    // tracked, so @@is_greeting N>0 entries stay off.
    greetingIndex: 0,
    vars: macroScope.vars,
    // Same per-turn seed as the macro engine: @@probability stable across
    // regenerates, fresh roll each turn.
    seed: macroScope.seed,
  });

  // Build named content SLOTS. A prompt template (default or preset-defined)
  // orders these into the final prompt. The default template reproduces the
  // historical fixed order, so the no-template path is byte-identical.
  const joinNonEmpty = (parts: string[]) =>
    parts.filter(Boolean).join("\n\n").trim();

  // main = preset.mainPrompt then the web-search/guest fallback message.
  const mainSlot = joinNonEmpty([
    expand(preset?.mainPrompt),
    fallbackSystemMessage ?? "",
  ]);

  // Expanded entry bodies for one lorebook position, prompt-ready.
  const loreAt = (pos: string) =>
    joinNonEmpty(
      selected.filter((x) => x.position === pos).map((e) => expand(e.content)),
    );

  // Multi-char: primary owns {{char}}; non-primary alwaysActive=false is trigger-gated.
  const charScanText = recentUserTexts.join("\n");
  const charBlocks: string[] = [];
  for (let i = 0; i < boundCharacters.length; i++) {
    const binding = boundCharacters[i];
    // Per-conversation overrides (binding.overrides) win over the stored
    // character fields. Previously loaded but never applied.
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
    // exampleMessages are emitted as role-tagged few-shot turns (below), not as
    // a description blob, so they are intentionally NOT pushed here.
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

  // Post-history: jailbreak/UJB + preset.postHistory + bottom lore.
  const postHistorySlot = joinNonEmpty([
    expand(primary?.postHistoryInstructions),
    expand(preset?.postHistory),
    loreAt("bottom"),
  ]);

  // Empty slot text -> null so the template walk skips the card.
  const sys = (text: string) =>
    text ? { text, role: "system" as const } : null;
  const slots: TemplateSlots = {
    main: sys(mainSlot),
    loreTop: sys(loreAt("top")),
    loreBeforeChar: sys(loreAt("before_char")),
    description: sys(descriptionSlot),
    persona: sys(personaSlot),
    loreAfterChar: sys(loreAt("after_char")),
    systemPrompt: sys(systemPromptSlot),
    postHistory: sys(postHistorySlot),
  };

  const template =
    parsePromptTemplate(preset?.promptTemplate) ?? DEFAULT_PROMPT_TEMPLATE;
  const promptParts = walkTemplate(template, slots);

  // Example dialogue as role-tagged few-shot turns, spliced in just before the
  // chat history (RisuAI exampleMessage). Macro-expanded; the model reads them
  // as real example turns instead of a description blob.
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

  // Top-level `system` param = the LEADING run of system messages only (what
  // the stream service hoists out of promptParts). Non-system pre-chat parts
  // and everything after the chat marker are emitted inline by the stream, so
  // they must NOT be duplicated into `system` here.
  const leadSystem: string[] = [];
  for (const p of promptParts) {
    if (p.kind === "message" && p.role === "system") leadSystem.push(p.text);
    else break;
  }
  const system = joinNonEmpty(leadSystem) || fallbackSystemMessage;
  // postHistory scalar retained for any non-template caller; in the template
  // flow the stream emits after-chat parts inline, so it is informational.
  const chatIdx = promptParts.findIndex((p) => p.kind === "chatHistory");
  const postHistory =
    chatIdx === -1
      ? undefined
      : joinNonEmpty(
          promptParts
            .slice(chatIdx + 1)
            .filter(
              (p): p is Extract<typeof p, { kind: "message" }> =>
                p.kind === "message",
            )
            .map((p) => p.text),
        ) || undefined;

  const atDepthEntries: DepthInjection[] = selected
    .filter((e) => e.position === "at_depth")
    .map((e) => ({
      text: expand(e.content),
      depth: e.depth ?? 4,
      // Pass the entry's role through verbatim (user/system/assistant). Default
      // is system (RisuAI/ST), so a depth note without a role is a system note.
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
    // Precedence: conversation override -> preset default -> system default.
    // null on the conversation means "inherit the preset".
    chatMemory: settings.chatMemory ?? preset?.chatMemory ?? 8,
    streamingEnabled:
      settings.streamingEnabled ?? preset?.streamingEnabled ?? true,
    authorNote,
    atDepthEntries,
    extraBody,
    providerRouting: parseProviderRouting(preset?.providers),
    prefill: preset?.prefill ? expand(preset.prefill) : undefined,
    postHistory,
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

// Two-pass token estimate of the non-history prompt: every emitted message part
// plus the depth/author injections. Used by the stream service to reserve space
// before fitting chat history to the model context window.
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
