import { getDb } from "@/lib/db/client";
import {
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversationSettings,
  lorebookEntries,
  lorebooks,
  personas,
  samplingPresets,
} from "@/lib/db/schema";
import type { StreamOverrides } from "@/lib/validation/chat";
import { logger } from "@/lib/utils/logger";
import { and, asc, eq, inArray } from "drizzle-orm";
import { encode } from "gpt-tokenizer";

/** Single synthetic system message to splice into the upstream message array
 *  at `depth` turns from the end (1 = before the last message, etc). */
export type DepthInjection = {
  text: string;
  depth: number;
};

/**
 * Source shape that can carry sampling overrides: presets, conversation
 * settings, and per-stream overrides all match this. `maxTokens` maps to the
 * SDK's `maxOutputTokens`; the rest pass through verbatim.
 */
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

/**
 * Merge non-null sampling fields from `src` into `dest`. Later calls win
 * field-by-field, so callers should layer base → overrides.
 */
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
  if (src.frequencyPenalty != null) dest.frequencyPenalty = src.frequencyPenalty;
  if (src.presencePenalty != null) dest.presencePenalty = src.presencePenalty;
  if (src.repetitionPenalty != null) dest.repetitionPenalty = src.repetitionPenalty;
  if (src.maxTokens != null) dest.maxOutputTokens = src.maxTokens;
}

export type AssembledSystem = {
  /** Composed system prompt (character + persona + before/after-char lorebook + web search). */
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
  /** Author's note as a depth-injected synthetic system message. */
  authorNote?: DepthInjection;
  /** Lorebook entries with `position=at_depth`, each with their own depth. */
  atDepthEntries: DepthInjection[];
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

/**
 * Build an `AssembledSystem` from per-stream `body.overrides` only. Used when
 * the conversation has no `conversation_settings` row (guest convs, or the
 * very first turn before the row is created). Mirrors the shape of
 * `assembleForStream` so `streamChat` can pass either result through.
 */
export function assembleFromOverrides(
  overrides: StreamOverrides | undefined,
  fallbackSystemMessage: string | undefined,
): AssembledSystem {
  const sampling: AssembledSystem["sampling"] = {};
  mergeSampling(sampling, overrides);
  const sections: string[] = [];
  if (fallbackSystemMessage) sections.push(fallbackSystemMessage);
  if (overrides?.systemPromptOverride) sections.push(overrides.systemPromptOverride);
  const authorNote =
    overrides?.authorNote
      ? { text: overrides.authorNote, depth: overrides.authorNoteDepth ?? 4 }
      : undefined;
  return {
    system: sections.length ? sections.join("\n\n") : undefined,
    sampling,
    reasoningEffort: overrides?.reasoningEffort ?? undefined,
    chatMemory: overrides?.chatMemory ?? 0,
    authorNote,
    atDepthEntries: [],
  };
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

  const [lbRows, lbEntries] =
    lorebookIds.length > 0
      ? await Promise.all([
          db
            .select()
            .from(lorebooks)
            .where(inArray(lorebooks.id, lorebookIds)),
          db
            .select()
            .from(lorebookEntries)
            .where(
              and(
                inArray(lorebookEntries.lorebookId, lorebookIds),
                eq(lorebookEntries.enabled, true),
              ),
            ),
        ])
      : [[], []];

  return { settings, boundCharacters, persona, preset, lbRows, lbEntries };
}

type LbEntry = LoadedConvContext extends infer T
  ? T extends { lbEntries: infer E }
    ? E extends ReadonlyArray<infer Item>
      ? Item
      : never
    : never
  : never;

type LbRow = LoadedConvContext extends infer T
  ? T extends { lbRows: infer R }
    ? R extends ReadonlyArray<infer Item>
      ? Item
      : never
    : never
  : never;

/**
 * Filter `entries` to those whose primary keys (or `constant`) match `text`.
 * Returns matched entries in priority-desc order. Caller handles budgeting.
 */
function matchEntries(entries: LbEntry[], text: string): LbEntry[] {
  if (entries.length === 0) return [];
  const lower = text.toLowerCase();
  const matched = entries.filter((e) => {
    if (e.constant) return true;
    const keys = (e.keys ?? []) as string[];
    const hit = keys.some((k) => lower.includes(k.toLowerCase()));
    if (!hit) return false;
    if (e.selective) {
      const sec = (e.secondaryKeys ?? []) as string[];
      return sec.length === 0 || sec.some((k) => lower.includes(k.toLowerCase()));
    }
    return true;
  });
  matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return matched;
}

const MAX_RECURSIVE_PASSES = 3;

/**
 * Select lorebook entries to inject for this turn, respecting per-lorebook
 * `scanDepth`, `tokenBudget`, and `recursiveScanning`. Each book is scanned
 * independently; results are merged (dedup by entry id) and globally
 * priority-sorted.
 *
 * @param recentUserTexts user-message texts in newest-first order
 * @param entries all enabled entries from all bound books
 * @param books book metadata keyed by id (provides scanDepth/tokenBudget/recursive)
 */
export function selectLorebookEntries(
  recentUserTexts: string[],
  entries: LbEntry[],
  books: Map<string, LbRow>,
): LbEntry[] {
  if (entries.length === 0) return [];

  const byBook = new Map<string, LbEntry[]>();
  for (const e of entries) {
    const arr = byBook.get(e.lorebookId) ?? [];
    arr.push(e);
    byBook.set(e.lorebookId, arr);
  }

  const seen = new Set<string>();
  const merged: LbEntry[] = [];

  for (const [bookId, bookEntries] of byBook) {
    const book = books.get(bookId);
    const scanDepth = book?.scanDepth ?? 4;
    const budget = book?.tokenBudget ?? 1500;
    const recursive = book?.recursiveScanning ?? false;

    let scanText = recentUserTexts.slice(0, scanDepth).join("\n");
    let used = 0;
    const accepted: LbEntry[] = [];

    for (let pass = 0; pass < MAX_RECURSIVE_PASSES; pass++) {
      const matched = matchEntries(
        bookEntries.filter((e) => !seen.has(e.id) && !accepted.some((a) => a.id === e.id)),
        scanText,
      );
      if (matched.length === 0) break;

      let added = 0;
      for (const e of matched) {
        const cost = estimateTokens(e.content);
        if (used + cost > budget) continue;
        accepted.push(e);
        used += cost;
        added++;
      }
      if (added === 0 || !recursive) break;
      // Next pass scans the freshly-injected content for further keyword hits.
      scanText = accepted.map((e) => e.content).join("\n");
    }

    for (const e of accepted) {
      seen.add(e.id);
      merged.push(e);
    }
  }

  merged.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return merged;
}

/**
 * Compose the final system prompt + sampling + depth-injections for a stream
 * call.
 *
 * @param convId conversation id
 * @param recentUserTexts user-message texts in newest-first order
 * @param fallbackSystemMessage e.g. web-search context the caller already built
 */
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
      atDepthEntries: [],
    };
  }

  const { settings, boundCharacters, persona, preset, lbRows, lbEntries } = ctx;

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

  // Per-book selection (each book brings its own scanDepth, tokenBudget,
  // recursiveScanning).
  const booksById = new Map(lbRows.map((b) => [b.id, b]));
  const selected = selectLorebookEntries(recentUserTexts, lbEntries, booksById);

  // Compose static system block
  const sections: string[] = [];

  if (fallbackSystemMessage) sections.push(fallbackSystemMessage);

  for (const e of selected.filter((x) => x.position === "top"))
    sections.push(expand(e.content));
  for (const e of selected.filter((x) => x.position === "before_char"))
    sections.push(expand(e.content));

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

  if (persona) {
    const pBlock: string[] = [`# User persona: ${persona.name}`];
    if (persona.description) pBlock.push(expand(persona.description));
    sections.push(pBlock.join("\n\n"));
  }

  for (const e of selected.filter((x) => x.position === "after_char"))
    sections.push(expand(e.content));

  const sysOverride = settings.systemPromptOverride ?? primary?.systemPrompt ?? null;
  if (sysOverride) sections.push(expand(sysOverride));

  if (primary?.postHistoryInstructions)
    sections.push(expand(primary.postHistoryInstructions));

  for (const e of selected.filter((x) => x.position === "bottom"))
    sections.push(expand(e.content));

  const system =
    sections.filter(Boolean).join("\n\n").trim() || fallbackSystemMessage;

  // Depth injections: author note + at_depth lorebook entries. Caller splices
  // these as synthetic system messages into the message array.
  const atDepthEntries: DepthInjection[] = selected
    .filter((e) => e.position === "at_depth")
    .map((e) => ({ text: expand(e.content), depth: e.depth ?? 4 }));
  const authorNote = settings.authorNote
    ? { text: expand(settings.authorNote), depth: settings.authorNoteDepth ?? 4 }
    : undefined;

  // Sampling: layer preset (base) under settings (overrides). Field-by-field
  // non-null wins.
  const sampling: AssembledSystem["sampling"] = {};
  mergeSampling(sampling, preset);
  mergeSampling(sampling, settings);

  const reasoningEffort =
    settings.reasoningEffort ?? primary?.defaultReasoningEffort ?? undefined;

  logger.info("Stream prompt assembled", {
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
    authorNote,
    atDepthEntries,
  };
}
