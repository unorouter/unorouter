import { logger } from "@/lib/utils/logger";
import {
  parseExtraBody as parseExtraBodyShared,
  type StreamOverrides,
} from "@/lib/validation/chat";
import { loadConvContext } from "./prompt-assembler/conv-context";
import type { LoadedConvContext } from "@/lib/types";
import { keyHits, selectLorebookEntries } from "./prompt-assembler/lorebook";

export type DepthInjection = {
  text: string;
  depth: number;
  role?: "system" | "user";
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

function mergeSampling(
  dest: AssembledSystem["sampling"],
  src: SamplingSource | null | undefined,
): void {
  if (!src) return;
  if (src.temperature != null) dest.temperature = src.temperature;
  if (src.topP != null) dest.topP = src.topP;
  if (src.topK != null) dest.topK = src.topK;
  if (src.minP != null) dest.minP = src.minP;
  if (src.topA != null) dest.topA = src.topA;
  if (src.frequencyPenalty != null)
    dest.frequencyPenalty = src.frequencyPenalty;
  if (src.presencePenalty != null) dest.presencePenalty = src.presencePenalty;
  if (src.repetitionPenalty != null)
    dest.repetitionPenalty = src.repetitionPenalty;
  if (src.maxTokens != null) dest.maxOutputTokens = src.maxTokens;
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
  prefill?: string;
  vars: {
    user: string;
    char: string;
    user_description: string;
    char_description: string;
    scenario: string;
  };
  flags: {
    forceAlternateRoles: boolean;
    noSystemRole: boolean;
    mustStartWithUserInput: boolean;
    skipPrefillIfLastIsAssistant: boolean;
    geminiBlockOff: boolean;
  };
};

function parseExtraBody(
  raw: string | null | undefined,
): Record<string, unknown> | undefined {
  const r = parseExtraBodyShared(raw);
  return r.state === "valid" ? r.parsed : undefined;
}

const TEMPLATE_VAR_RE =
  /\{\{(user|char|user_description|char_description|scenario)\}\}/g;

export function expandTemplateVars(
  text: string,
  vars: {
    user?: string;
    char?: string;
    user_description?: string;
    char_description?: string;
    scenario?: string;
  },
): string {
  return text.replace(TEMPLATE_VAR_RE, (_, key: keyof typeof vars) => {
    return vars[key] ?? "";
  });
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
  return {
    system: sections.length ? sections.join("\n\n") : undefined,
    sampling,
    reasoningEffort: overrides?.reasoningEffort ?? undefined,
    // 0 default silently disabled chat memory for guests.
    chatMemory: overrides?.chatMemory ?? 8,
    streamingEnabled: overrides?.streamingEnabled ?? true,
    authorNote,
    atDepthEntries: [],
    extraBody: parseExtraBody(overrides?.extraBody),
    vars: {
      user: "User",
      char: "Assistant",
      user_description: "",
      char_description: "",
      scenario: "",
    },
    flags: {
      forceAlternateRoles: false,
      noSystemRole: false,
      mustStartWithUserInput: false,
      skipPrefillIfLastIsAssistant: false,
      geminiBlockOff: false,
    },
  };
}

export async function assembleForStream(
  convId: string,
  recentUserTexts: string[],
  fallbackSystemMessage?: string,
  preloadedCtx?: LoadedConvContext,
): Promise<AssembledSystem> {
  const ctx = preloadedCtx ?? (await loadConvContext(convId));
  if (!ctx) {
    return {
      system: fallbackSystemMessage,
      sampling: {},
      chatMemory: 8,
      streamingEnabled: true,
      atDepthEntries: [],
      vars: {
        user: "User",
        char: "Assistant",
        user_description: "",
        char_description: "",
        scenario: "",
      },
      flags: {
        forceAlternateRoles: false,
        noSystemRole: false,
        mustStartWithUserInput: false,
        skipPrefillIfLastIsAssistant: false,
        geminiBlockOff: false,
      },
    };
  }

  const { settings, boundCharacters, persona, preset, lbRows, lbEntries } = ctx;

  const primary = boundCharacters[0]?.character;
  const userName = persona?.name ?? "User";
  const charName = primary?.name ?? "Assistant";
  const userDesc = persona?.description ?? "";
  const charDesc = primary?.description ?? "";
  const scenario = primary?.scenario ?? "";

  const expand = (text: string | null | undefined) =>
    text
      ? expandTemplateVars(text, {
          user: userName,
          char: charName,
          user_description: userDesc,
          char_description: charDesc,
          scenario,
        })
      : "";

  const booksById = new Map(lbRows.map((b) => [b.id, b]));
  const selected = selectLorebookEntries(recentUserTexts, lbEntries, booksById);

  const sections: string[] = [];

  if (preset?.mainPrompt) sections.push(expand(preset.mainPrompt));

  if (fallbackSystemMessage) sections.push(fallbackSystemMessage);

  for (const e of selected.filter((x) => x.position === "top"))
    sections.push(expand(e.content));
  for (const e of selected.filter((x) => x.position === "before_char"))
    sections.push(expand(e.content));

  // Multi-char: primary owns {{char}}; non-primary alwaysActive=false is trigger-gated.
  const charScanText = recentUserTexts.join("\n");
  for (let i = 0; i < boundCharacters.length; i++) {
    const binding = boundCharacters[i];
    const ch = binding.character;
    const isPrimary = i === 0;
    const triggers = (ch.triggers ?? null) as string[] | null;
    const gated =
      !isPrimary &&
      ch.alwaysActive === false &&
      Array.isArray(triggers) &&
      triggers.length > 0;
    if (gated) {
      const hit = triggers.some((k) =>
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
    if (ch.exampleMessages)
      charBlock.push(`## Example dialogue\n${expand(ch.exampleMessages)}`);
    if (charBlock.length > 0) sections.push(charBlock.join("\n\n"));
  }

  if (persona) {
    const pBlock: string[] = [`# User persona: ${persona.name}`];
    if (persona.description) pBlock.push(expand(persona.description));
    sections.push(pBlock.join("\n\n"));
  }

  for (const e of selected.filter((x) => x.position === "after_char"))
    sections.push(expand(e.content));

  // ST parity: only primary's systemPrompt/postHistoryInstructions emit.
  const sysOverride =
    settings.systemPromptOverride ?? primary?.systemPrompt ?? null;
  if (sysOverride) sections.push(expand(sysOverride));

  if (primary?.postHistoryInstructions)
    sections.push(expand(primary.postHistoryInstructions));

  if (preset?.postHistory) sections.push(expand(preset.postHistory));

  for (const e of selected.filter((x) => x.position === "bottom"))
    sections.push(expand(e.content));

  const system =
    sections.filter(Boolean).join("\n\n").trim() || fallbackSystemMessage;

  const atDepthEntries: DepthInjection[] = selected
    .filter((e) => e.position === "at_depth")
    .map((e) => ({
      text: expand(e.content),
      depth: e.depth ?? 4,
      role: e.injectionRole === "system" ? "system" : "user",
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
    chatMemory: settings.chatMemory,
    streamingEnabled: settings.streamingEnabled ?? true,
    authorNote,
    atDepthEntries,
    extraBody,
    prefill: preset?.prefill ? expand(preset.prefill) : undefined,
    vars: {
      user: userName,
      char: charName,
      user_description: userDesc,
      char_description: charDesc,
      scenario,
    },
    flags: {
      forceAlternateRoles: preset?.forceAlternateRoles ?? false,
      noSystemRole: preset?.noSystemRole ?? false,
      mustStartWithUserInput: preset?.mustStartWithUserInput ?? false,
      skipPrefillIfLastIsAssistant:
        preset?.skipPrefillIfLastIsAssistant ?? false,
      geminiBlockOff: preset?.geminiBlockOff ?? false,
    },
  };
}
