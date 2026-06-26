import {
  parseLorebook,
  serializeLorebook,
  type CCv3CharacterBook,
  type CCv3LorebookEntry,
  type LorebookFormat,
} from "@character-foundry/character-foundry/lorebook";

type ParsedLorebook = {
  name: string;
  description?: string;
  scanDepth?: number;
  tokenBudget?: number;
  recursiveScanning?: boolean;
  entries: Array<{
    comment?: string;
    keys: string[];
    secondaryKeys?: string[];
    content: string;
    constant: boolean;
    selective: boolean;
    priority: number;
    enabled: boolean;
    orderIndex: number;
  }>;
};

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
      // ST/CCv3 `comment` = the non-AI entry name.
      comment: typeof e.comment === "string" && e.comment ? e.comment : undefined,
      keys,
      secondaryKeys:
        Array.isArray(e.secondary_keys) && e.secondary_keys.length > 0
          ? e.secondary_keys
          : undefined,
      content: e.content,
      constant: e.constant ?? false,
      selective: e.selective ?? false,
      priority: e.priority ?? 100,
      // Imported Risu/ST order maps to orderIndex; position is dropped (single-slot model).
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
    comment: string | null;
    keys: string[];
    secondaryKeys: string[] | null;
    content: string;
    constant: boolean | null;
    selective: boolean | null;
    priority: number | null;
    enabled: boolean | null;
    orderIndex: number | null;
  }>,
  format: LorebookFormat = "sillytavern",
): string {
  // orderIndex maps to insertion_order; no position concept (single-slot model).
  const ccv3Entries: CCv3LorebookEntry[] = entries.map((e, i) => ({
    keys: e.keys,
    content: e.content,
    comment: e.comment ?? undefined,
    enabled: e.enabled ?? true,
    insertion_order: e.orderIndex ?? i,
    secondary_keys: e.secondaryKeys ?? undefined,
    constant: e.constant ?? false,
    selective: e.selective ?? false,
    priority: e.priority ?? 100,
  }));

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
