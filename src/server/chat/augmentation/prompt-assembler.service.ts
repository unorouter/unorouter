import { getDb } from "@/lib/db/client";
import {
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversationSettings,
  lorebookEntries,
  personas,
  samplingPresets,
} from "@/lib/db/schema";
import { logger } from "@/lib/utils/logger";
import { and, asc, eq, inArray } from "drizzle-orm";
import { encode } from "gpt-tokenizer";

export type AssembledSystem = {
  /** Composed system prompt (character + persona + lorebook + author note + web search). */
  system: string | undefined;
  /** Numbers passed straight through to streamText; new-api strips unsupported. */
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
  /** Sliding-window size to apply to messages array. */
  chatMemory: number;
  /** Active character (for {{char}} substitution and message metadata). */
  activeCharacterId?: string;
  /** Active persona name (for {{user}} substitution). */
  activePersonaName?: string;
  /** Per-conversation web-search overrides; absent = use the body flag. */
  webSearch?: {
    enabled: boolean;
    engine: string;
    contextSize: string;
  };
};

const TEMPLATE_VAR_RE = /\{\{(user|char|user_description|char_description|scenario)\}\}/g;

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

/**
 * Accurate token count via gpt-tokenizer (cl100k_base by default, matches
 * GPT-4 / GPT-4o / GPT-3.5-turbo. Close enough for non-OpenAI models for
 * budget decisions; off by ~10-20% on Claude/Gemini, which is fine here).
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
}

export type LoadedConvContext = Awaited<ReturnType<typeof loadConvContext>>;

export async function loadConvContext(convId: string) {
  const db = getDb();

  const settingsRows = await db
    .select()
    .from(conversationSettings)
    .where(eq(conversationSettings.convId, convId))
    .limit(1);
  const settings = settingsRows[0];
  if (!settings) return null;

  const charBindings = await db
    .select({
      characterId: conversationCharacters.characterId,
      orderIndex: conversationCharacters.orderIndex,
      isActive: conversationCharacters.isActive,
      overrides: conversationCharacters.overrides,
    })
    .from(conversationCharacters)
    .where(
      and(
        eq(conversationCharacters.convId, convId),
        eq(conversationCharacters.isActive, true),
      ),
    )
    .orderBy(asc(conversationCharacters.orderIndex));

  const charRows =
    charBindings.length > 0
      ? await db
          .select()
          .from(characters)
          .where(
            inArray(
              characters.id,
              charBindings.map((b) => b.characterId),
            ),
          )
      : [];
  const charById = new Map(charRows.map((c) => [c.id, c]));
  const boundCharacters = charBindings
    .map((b) => ({ binding: b, character: charById.get(b.characterId) }))
    .filter(
      (x): x is { binding: typeof charBindings[number]; character: typeof charRows[number] } =>
        !!x.character,
    );

  const persona = settings.personaId
    ? (
        await db
          .select()
          .from(personas)
          .where(eq(personas.id, settings.personaId))
          .limit(1)
      )[0]
    : undefined;

  const preset = settings.presetId
    ? (
        await db
          .select()
          .from(samplingPresets)
          .where(eq(samplingPresets.id, settings.presetId))
          .limit(1)
      )[0]
    : undefined;

  const lbBindings = await db
    .select({ lorebookId: conversationLorebooks.lorebookId })
    .from(conversationLorebooks)
    .where(eq(conversationLorebooks.convId, convId))
    .orderBy(asc(conversationLorebooks.orderIndex));
  const lorebookIds = lbBindings.map((b) => b.lorebookId);

  const lbEntries =
    lorebookIds.length > 0
      ? await db
          .select()
          .from(lorebookEntries)
          .where(
            and(
              inArray(lorebookEntries.lorebookId, lorebookIds),
              eq(lorebookEntries.enabled, true),
            ),
          )
      : [];

  return { settings, boundCharacters, persona, preset, lbEntries };
}

/**
 * Match lorebook entries against recent user messages within the configured
 * scan depth + token budget. Returns the entries that should be injected.
 */
export function selectLorebookEntries(
  entries: LoadedConvContext extends infer T
    ? T extends { lbEntries: infer E }
      ? E
      : never
    : never,
  recentText: string,
  tokenBudget: number,
): typeof entries {
  if (!entries || entries.length === 0) return entries;

  const lower = recentText.toLowerCase();
  const matched = entries.filter((e) => {
    if (e.constant) return true;
    const keys = (e.keys ?? []) as string[];
    const matches = keys.some((k) => lower.includes(k.toLowerCase()));
    if (!matches) return false;
    if (e.selective) {
      const sec = (e.secondaryKeys ?? []) as string[];
      return sec.length === 0 || sec.some((k) => lower.includes(k.toLowerCase()));
    }
    return true;
  });

  // Highest priority first
  matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  let used = 0;
  const out: typeof matched = [];
  for (const e of matched) {
    const cost = estimateTokens(e.content);
    if (used + cost > tokenBudget) break;
    out.push(e);
    used += cost;
  }
  return out;
}

/**
 * Compose the final system prompt and sampling parameters for a stream call.
 *
 * @param convId conversation id
 * @param recentUserText concatenation of the last N user-message texts (caller passes this in; this fn doesn't fetch messages)
 * @param fallbackSystemMessage e.g. web-search context the caller already built
 */
export async function assembleForStream(
  convId: string,
  recentUserText: string,
  fallbackSystemMessage?: string,
  preloadedCtx?: LoadedConvContext,
): Promise<AssembledSystem> {
  const ctx = preloadedCtx ?? (await loadConvContext(convId));
  if (!ctx) {
    return {
      system: fallbackSystemMessage,
      sampling: {},
      chatMemory: 8,
    };
  }

  const { settings, boundCharacters, persona, preset, lbEntries } = ctx;

  // Pick the primary character (first active) for {{char}} resolution
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

  // Lorebook entries selected against recent user text. The token budget is
  // intentionally a constant; per-lorebook tokenBudget overrides land in
  // selectLorebookEntries when we ship per-book budgeting.
  const selected = selectLorebookEntries(lbEntries, recentUserText, 1500);

  // Compose
  const sections: string[] = [];

  if (fallbackSystemMessage) sections.push(fallbackSystemMessage);

  // Top-position lorebook entries
  const top = selected.filter((e) => e.position === "top");
  for (const e of top) sections.push(expand(e.content));

  // before_char (default)
  const beforeChar = selected.filter((e) => e.position === "before_char");
  for (const e of beforeChar) sections.push(expand(e.content));

  // Character description block
  if (primary) {
    const charBlock: string[] = [];
    if (primary.description) {
      charBlock.push(`# ${primary.name}\n\n${expand(primary.description)}`);
    } else if (primary.name) {
      charBlock.push(`# ${primary.name}`);
    }
    if (primary.personality)
      charBlock.push(`## Personality\n${expand(primary.personality)}`);
    if (primary.scenario)
      charBlock.push(`## Scenario\n${expand(primary.scenario)}`);
    if (primary.exampleMessages)
      charBlock.push(`## Example dialogue\n${expand(primary.exampleMessages)}`);
    if (charBlock.length > 0) sections.push(charBlock.join("\n\n"));
  }

  // Persona block
  if (persona) {
    const pBlock: string[] = [];
    pBlock.push(`# User persona: ${persona.name}`);
    if (persona.description) pBlock.push(expand(persona.description));
    sections.push(pBlock.join("\n\n"));
  }

  // after_char lorebook entries
  const afterChar = selected.filter((e) => e.position === "after_char");
  for (const e of afterChar) sections.push(expand(e.content));

  // System prompt override (or character system prompt)
  const sysOverride = settings.systemPromptOverride ?? primary?.systemPrompt ?? null;
  if (sysOverride) sections.push(expand(sysOverride));

  // Author's note (depth-injection signaled via marker; new-api/upstream-side handling is out of scope here, we append)
  if (settings.authorNote) sections.push(`# Author's note\n${expand(settings.authorNote)}`);

  // Post-history instructions (jailbreak / final guidance)
  if (primary?.postHistoryInstructions)
    sections.push(expand(primary.postHistoryInstructions));

  // bottom-position lorebook entries
  const bottom = selected.filter((e) => e.position === "bottom");
  for (const e of bottom) sections.push(expand(e.content));

  const system =
    sections.filter(Boolean).join("\n\n").trim() || fallbackSystemMessage;

  // Sampling: layered. Preset provides the base; conversation-level inline
  // overrides win field-by-field when non-null.
  const sampling: AssembledSystem["sampling"] = {};
  if (preset) {
    if (preset.temperature !== null) sampling.temperature = preset.temperature ?? undefined;
    if (preset.topP !== null) sampling.topP = preset.topP ?? undefined;
    if (preset.topK !== null) sampling.topK = preset.topK ?? undefined;
    if (preset.minP !== null) sampling.minP = preset.minP ?? undefined;
    if (preset.topA !== null) sampling.topA = preset.topA ?? undefined;
    if (preset.frequencyPenalty !== null)
      sampling.frequencyPenalty = preset.frequencyPenalty ?? undefined;
    if (preset.presencePenalty !== null)
      sampling.presencePenalty = preset.presencePenalty ?? undefined;
    if (preset.repetitionPenalty !== null)
      sampling.repetitionPenalty = preset.repetitionPenalty ?? undefined;
    if (preset.maxTokens !== null) sampling.maxOutputTokens = preset.maxTokens ?? undefined;
  }
  if (settings.temperature !== null) sampling.temperature = settings.temperature ?? undefined;
  if (settings.topP !== null) sampling.topP = settings.topP ?? undefined;
  if (settings.topK !== null) sampling.topK = settings.topK ?? undefined;
  if (settings.minP !== null) sampling.minP = settings.minP ?? undefined;
  if (settings.topA !== null) sampling.topA = settings.topA ?? undefined;
  if (settings.frequencyPenalty !== null)
    sampling.frequencyPenalty = settings.frequencyPenalty ?? undefined;
  if (settings.presencePenalty !== null)
    sampling.presencePenalty = settings.presencePenalty ?? undefined;
  if (settings.repetitionPenalty !== null)
    sampling.repetitionPenalty = settings.repetitionPenalty ?? undefined;
  if (settings.maxTokens !== null) sampling.maxOutputTokens = settings.maxTokens ?? undefined;

  const reasoningEffort =
    settings.reasoningEffort ?? primary?.defaultReasoningEffort ?? undefined;

  logger.info("Stream prompt assembled", {
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
    chatMemory: settings.chatMemory,
    activeCharacterId: primary?.id,
    activePersonaName: persona?.name,
    webSearch: {
      enabled: settings.webSearchEnabled,
      engine: settings.webSearchEngine,
      contextSize: settings.webSearchContextSize,
    },
  };
}
