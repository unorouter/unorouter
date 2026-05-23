import { getDb } from "@/lib/db/server/client";
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
import {
  parseExtraBody as parseExtraBodyShared,
  type StreamOverrides,
} from "@/lib/validation/chat";
import { logger } from "@/lib/utils/logger";
import { and, asc, eq, inArray } from "drizzle-orm";
import { encode } from "gpt-tokenizer";

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

// gpt-tokenizer (cl100k_base) is off by ~10-20% on Claude/Gemini, fine here.
function estimateTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
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
    chatMemory: overrides?.chatMemory ?? 0,
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
      (
        x,
      ): x is {
        binding: (typeof charBindings)[number];
        character: (typeof charRows)[number];
      } => !!x.character,
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
          db.select().from(lorebooks).where(inArray(lorebooks.id, lorebookIds)),
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

type ClientBoundCharacter = {
  binding: {
    characterId: string;
    orderIndex?: number;
    isActive?: boolean;
    overrides?: unknown;
  };
  character: unknown;
};

type ClientChatContext = {
  persona?: unknown;
  // Bare rows (legacy) or `{binding, character}` (honors isActive/overrides).
  characters?: Array<unknown> | Array<ClientBoundCharacter>;
  lorebooks?: Array<{ lorebook: unknown; entries: Array<unknown> }>;
  preset?: unknown;
  settings?: unknown;
};

function isBoundCharacter(raw: unknown): raw is ClientBoundCharacter {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  return (
    obj.character != null &&
    typeof obj.binding === "object" &&
    obj.binding != null
  );
}

export function buildContextFromClient(
  ctx: ClientChatContext,
): LoadedConvContext {
  if (!ctx.settings) return null;
  const settings = ctx.settings as NonNullable<LoadedConvContext>["settings"];
  const rawChars = ctx.characters ?? [];
  type Bound = NonNullable<LoadedConvContext>["boundCharacters"][number];
  type Char = Bound["character"];
  const boundCharacters: Bound[] = [];
  rawChars.forEach((raw, i) => {
    if (isBoundCharacter(raw)) {
      if (raw.binding.isActive === false) return;
      boundCharacters.push({
        binding: {
          characterId: raw.binding.characterId,
          orderIndex: raw.binding.orderIndex ?? i,
          isActive: raw.binding.isActive ?? true,
          overrides: (raw.binding.overrides ?? null) as Bound["binding"]["overrides"],
        },
        character: raw.character as Char,
      });
      return;
    }
    const character = raw as Char;
    boundCharacters.push({
      binding: {
        characterId: character.id,
        orderIndex: i,
        isActive: true,
        overrides: null,
      },
      character,
    });
  });

  const persona = (ctx.persona ?? undefined) as
    | NonNullable<LoadedConvContext>["persona"]
    | undefined;
  const preset = (ctx.preset ?? undefined) as
    | NonNullable<LoadedConvContext>["preset"]
    | undefined;

  const lbRows: NonNullable<LoadedConvContext>["lbRows"] = [];
  const lbEntries: NonNullable<LoadedConvContext>["lbEntries"] = [];
  for (const lb of ctx.lorebooks ?? []) {
    lbRows.push(lb.lorebook as (typeof lbRows)[number]);
    for (const e of lb.entries) {
      lbEntries.push(e as (typeof lbEntries)[number]);
    }
  }

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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keyHits(key: string, text: string, wholeWords: boolean): boolean {
  if (!key) return false;
  if (wholeWords) {
    return new RegExp(`\\b${escapeRegex(key)}\\b`, "i").test(text);
  }
  return text.toLowerCase().includes(key.toLowerCase());
}

function matchEntries(entries: LbEntry[], text: string): LbEntry[] {
  if (entries.length === 0) return [];
  const matched = entries.filter((e) => {
    if (e.constant) return true;
    const keys = (e.keys ?? []) as string[];
    const whole = !!e.matchWholeWords;
    const hit = keys.some((k) => keyHits(k, text, whole));
    if (!hit) return false;
    if (e.selective) {
      const sec = (e.secondaryKeys ?? []) as string[];
      return sec.length === 0 || sec.some((k) => keyHits(k, text, whole));
    }
    return true;
  });
  matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return matched;
}

const MAX_RECURSIVE_PASSES = 3;

function selectLorebookEntries(
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
        bookEntries.filter(
          (e) => !seen.has(e.id) && !accepted.some((a) => a.id === e.id),
        ),
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

  // Multi-character: {{char}} resolves to the primary; each bound character
  // gets its own block (matches RisuAI/SillyTavern multi-char convention).
  // Non-primary blocks with alwaysActive=false are trigger-gated.
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
