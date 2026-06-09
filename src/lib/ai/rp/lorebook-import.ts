import {
  parseLorebook,
  serializeLorebook,
  type CCv3CharacterBook,
  type CCv3LorebookEntry,
  type LorebookFormat,
} from "@character-foundry/character-foundry/lorebook";
import type { LorebookPosition } from "@/lib/validation/rp-forms";

export type ParsedLorebook = {
  name: string;
  description?: string;
  scanDepth?: number;
  tokenBudget?: number;
  recursiveScanning?: boolean;
  entries: Array<{
    keys: string[];
    secondaryKeys?: string[];
    content: string;
    constant: boolean;
    selective: boolean;
    priority: number;
    position: LorebookPosition;
    depth: number;
    enabled: boolean;
    orderIndex: number;
  }>;
};

// CCv3 numeric positions, SillyTavern convention.
const NUMERIC_POSITION: LorebookPosition[] = [
  "before_char",
  "after_char",
  "top",
  "bottom",
  "at_depth",
];

// String positions: foundry's `in_chat` plus pass-through for DB-native names.
const STRING_POSITION: Record<LorebookPosition | "in_chat", LorebookPosition> =
  {
    in_chat: "at_depth",
    before_char: "before_char",
    after_char: "after_char",
    top: "top",
    bottom: "bottom",
    at_depth: "at_depth",
  };

type FoundryPosition = "before_char" | "after_char" | "in_chat";

const DB_TO_FOUNDRY_POSITION: Record<LorebookPosition, FoundryPosition> = {
  before_char: "before_char",
  after_char: "after_char",
  top: "before_char",
  bottom: "after_char",
  at_depth: "in_chat",
};

function mapPositionToDb(raw: unknown): LorebookPosition {
  if (typeof raw === "number") {
    return NUMERIC_POSITION[raw] ?? "before_char";
  }
  if (typeof raw === "string" && raw in STRING_POSITION) {
    return STRING_POSITION[raw as LorebookPosition | "in_chat"];
  }
  return "before_char";
}

export function parseLorebookJson(raw: unknown): ParsedLorebook | null {
  if (!raw || typeof raw !== "object") return null;

  let parsed;
  try {
    parsed = parseLorebook(new TextEncoder().encode(JSON.stringify(raw)));
  } catch {
    return null;
  }

  if (!parsed.book.entries || parsed.book.entries.length === 0) return null;

  const entries: ParsedLorebook["entries"] = [];
  parsed.book.entries.forEach((e: CCv3LorebookEntry, i: number) => {
    if (!e.content) return;
    const keys = e.keys ?? [];
    if (keys.length === 0 && !e.constant) return;

    entries.push({
      keys,
      secondaryKeys:
        Array.isArray(e.secondary_keys) && e.secondary_keys.length > 0
          ? e.secondary_keys
          : undefined,
      content: e.content,
      constant: e.constant ?? false,
      selective: e.selective ?? false,
      priority: e.priority ?? 100,
      position: mapPositionToDb(e.position),
      // CCv3 has no per-entry depth; ST stores in extensions.
      depth:
        typeof (e as Record<string, unknown>).depth === "number"
          ? ((e as Record<string, unknown>).depth as number)
          : 4,
      enabled: e.enabled,
      orderIndex: typeof e.insertion_order === "number" ? e.insertion_order : i,
    });
  });

  if (entries.length === 0) return null;

  return {
    name: parsed.book.name ?? "Imported lorebook",
    description: parsed.book.description,
    scanDepth: parsed.book.scan_depth,
    tokenBudget: parsed.book.token_budget,
    recursiveScanning: parsed.book.recursive_scanning,
    entries,
  };
}

export function serializeLorebookForExport(
  book: {
    name: string;
    description: string | null;
    scanDepth: number | null;
    tokenBudget: number | null;
    recursiveScanning: boolean | null;
  },
  entries: Array<{
    keys: unknown;
    secondaryKeys: unknown;
    content: string;
    constant: boolean | null;
    selective: boolean | null;
    priority: number | null;
    position: string | null;
    depth: number | null;
    enabled: boolean | null;
    orderIndex: number | null;
  }>,
  format: LorebookFormat = "sillytavern",
): string {
  const ccv3Entries: CCv3LorebookEntry[] = entries.map((e, i) => {
    const pos = (e.position ??
      "before_char") as keyof typeof DB_TO_FOUNDRY_POSITION;
    return {
      keys: Array.isArray(e.keys)
        ? (e.keys as unknown[]).filter(
            (k): k is string => typeof k === "string",
          )
        : [],
      content: e.content,
      enabled: e.enabled ?? true,
      insertion_order: e.orderIndex ?? i,
      secondary_keys: Array.isArray(e.secondaryKeys)
        ? (e.secondaryKeys as unknown[]).filter(
            (k): k is string => typeof k === "string",
          )
        : undefined,
      constant: e.constant ?? false,
      selective: e.selective ?? false,
      priority: e.priority ?? 100,
      position: DB_TO_FOUNDRY_POSITION[pos] ?? "before_char",
    };
  });

  const ccv3Book: CCv3CharacterBook = {
    name: book.name,
    description: book.description ?? undefined,
    scan_depth: book.scanDepth ?? undefined,
    token_budget: book.tokenBudget ?? undefined,
    recursive_scanning: book.recursiveScanning ?? undefined,
    entries: ccv3Entries,
  };

  return serializeLorebook(ccv3Book, format, undefined, true);
}
