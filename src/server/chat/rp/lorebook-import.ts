/**
 * Parse a SillyTavern / RisuAI world-info JSON file into our lorebook schema.
 *
 * Reference shapes:
 *  - SillyTavern: `{ name, entries: { "0": { keys[], content, position, ... } } }`
 *    `position`: 0=before_char, 1=after_char, 2=top, 3=bottom, 4=at_depth
 *  - RisuAI: similar, `entries` may be an array; sometimes wraps under
 *    `data.entries` with extra `risu_*` keys we ignore.
 *  - Chub.ai/AICC: same `chara_card_v2`-style envelope with `data.character_book`.
 */

const POSITION_MAP: Record<number, string> = {
  0: "before_char",
  1: "after_char",
  2: "top",
  3: "bottom",
  4: "at_depth",
};

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
    position: "before_char" | "after_char" | "top" | "bottom" | "at_depth";
    depth: number;
    enabled: boolean;
    orderIndex: number;
  }>;
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function mapPosition(
  raw: unknown,
): "before_char" | "after_char" | "top" | "bottom" | "at_depth" {
  if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    if (
      lower === "before_char" ||
      lower === "after_char" ||
      lower === "top" ||
      lower === "bottom" ||
      lower === "at_depth"
    ) {
      return lower;
    }
  }
  if (typeof raw === "number" && raw in POSITION_MAP) {
    return POSITION_MAP[raw] as
      | "before_char"
      | "after_char"
      | "top"
      | "bottom"
      | "at_depth";
  }
  return "before_char";
}

function mapEntry(
  raw: Record<string, unknown>,
  fallbackOrder: number,
): ParsedLorebook["entries"][number] | null {
  const content = asString(raw.content);
  if (!content) return null;

  const keys = asStringArray(raw.keys ?? raw.key ?? raw.primary_keys);
  if (keys.length === 0) {
    // Some exports rely on `comment` as a label and infer keys from there.
    // We keep entries with no keys but `constant: true` (always-on); skip
    // others since they would never match.
    if (!asBool(raw.constant, false)) return null;
  }

  const secondaryKeys = asStringArray(
    raw.secondary_keys ?? raw.secondaryKeys ?? raw.keysecondary,
  );

  return {
    keys,
    secondaryKeys: secondaryKeys.length > 0 ? secondaryKeys : undefined,
    content,
    constant: asBool(raw.constant, false),
    selective: asBool(raw.selective, false),
    priority: asNumber(raw.priority ?? raw.order ?? raw.insertion_order, 100),
    position: mapPosition(raw.position),
    depth: asNumber(raw.depth, 4),
    enabled: !asBool(raw.disable ?? raw.disabled, false),
    orderIndex: asNumber(raw.order ?? raw.uid ?? raw.id, fallbackOrder),
  };
}

export function parseLorebookJson(raw: unknown): ParsedLorebook | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;

  // Unwrap chara_card_v2 / v3 character_book envelope if present.
  const data = (() => {
    const d = root.data;
    if (d && typeof d === "object" && "character_book" in d) {
      return (d as Record<string, unknown>).character_book as Record<
        string,
        unknown
      >;
    }
    if (root.character_book && typeof root.character_book === "object") {
      return root.character_book as Record<string, unknown>;
    }
    return root;
  })();

  // Entries may be a record (`{"0": {...}}`) or an array.
  const rawEntries = data.entries;
  const list: Array<Record<string, unknown>> = [];
  if (Array.isArray(rawEntries)) {
    for (const e of rawEntries) {
      if (e && typeof e === "object") list.push(e as Record<string, unknown>);
    }
  } else if (rawEntries && typeof rawEntries === "object") {
    for (const v of Object.values(rawEntries)) {
      if (v && typeof v === "object") list.push(v as Record<string, unknown>);
    }
  }

  const entries: ParsedLorebook["entries"] = [];
  list.forEach((e, i) => {
    const mapped = mapEntry(e, i);
    if (mapped) entries.push(mapped);
  });

  if (entries.length === 0) return null;

  const name =
    asString(data.name) ?? asString(root.name) ?? "Imported lorebook";

  return {
    name,
    description: asString(data.description),
    scanDepth: asNumber(data.scan_depth ?? data.scanDepth, 4),
    tokenBudget: asNumber(data.token_budget ?? data.tokenBudget, 1500),
    recursiveScanning: asBool(
      data.recursive_scanning ?? data.recursiveScanning,
      false,
    ),
    entries,
  };
}
