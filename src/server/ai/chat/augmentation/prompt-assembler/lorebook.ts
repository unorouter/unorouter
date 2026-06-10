import { encode } from "gpt-tokenizer";
import { MAX_RECURSIVE_LOREBOOK_PASSES } from "@/lib/config/constants";
import type { LbEntry, LbRow } from "@/lib/types";
import { escapeRegex } from "@/lib/utils/base";
import { seededRand } from "@/lib/ai/chat/calc";

// Strip {{//...}} and {{comment:...}} from scan text before matching (Risu
// searchMatch parity: hidden comments never trigger keys).
function stripComments(text: string): string {
  return text
    .replace(/\{\{\/\/(.+?)\}\}/g, "")
    .replace(/\{\{comment:(.+?)\}\}/g, "");
}

export function keyHits(
  key: string,
  text: string,
  wholeWords: boolean,
): boolean {
  if (!key) return false;
  // Regex key: `/pattern/flags` (Risu useRegex keys survive import this way).
  if (key.startsWith("/") && key.lastIndexOf("/") > 0) {
    const lastSlash = key.lastIndexOf("/");
    try {
      return new RegExp(key.slice(1, lastSlash), key.slice(lastSlash + 1)).test(
        text,
      );
    } catch {
      return false;
    }
  }
  const cleaned = stripComments(text);
  if (wholeWords) {
    return new RegExp(`\\b${escapeRegex(key)}\\b`, "i").test(cleaned);
  }
  // Risu partial matching strips ALL spaces from both sides, so multi-word
  // keys match regardless of spacing/line breaks.
  return cleaned
    .toLowerCase()
    .replace(/ /g, "")
    .includes(key.toLowerCase().replace(/ /g, ""));
}

// gpt-tokenizer (cl100k_base) is off by ~10-20% on Claude/Gemini, fine here.
function estimateTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
}

export type LorebookPlacement =
  | "top"
  | "before_char"
  | "after_char"
  | "bottom"
  | "at_depth"
  | "before_desc"
  | "after_desc"
  | "personality"
  | "scenario";

// Per-entry overrides parsed from RisuAI/CCard `@@decorator value` lines at the
// top of an entry's content. The decorator lines are stripped from the body.
export type EntryDecorators = {
  body: string;
  probability?: number;
  priority?: number;
  scanDepth?: number;
  additionalKeys?: string[];
  excludeKeys?: string[];
  excludeKeysAll?: string[];
  // Placement + role overrides.
  position?: LorebookPlacement;
  depth?: number;
  reverseDepth?: boolean;
  role?: "user" | "assistant" | "system";
  // Match-mode override (@@match_full_word / @@match_partial_word).
  matchWholeWords?: boolean;
  // Force state (@@activate / @@dont_activate).
  forceState?: "activate" | "deactivate";
  // Sticky (@@keep_activate_after_match / @@dont_activate_after_match).
  keepActivateAfterMatch?: boolean;
  dontActivateAfterMatch?: boolean;
  // Chat-length gates.
  activateOnlyAfter?: number;
  activateOnlyEvery?: number;
  isGreeting?: number;
  // Recursion overrides (@@recursive / @@unrecursive / @@no_recursive_search).
  recursive?: boolean;
  noRecursiveSearch?: boolean;
  // @@ignore_on_max_context -> priority floor.
  ignoreOnMaxContext?: boolean;
  // Lore-into-lore injection (@@inject_lore / @@inject_at / @@inject_replace /
  // @@inject_prepend). location = target entry comment/name.
  inject?: {
    operation: "append" | "prepend" | "replace";
    location: string;
    lore: boolean;
  };
  // Suppress a UI prompt block (@@disable_ui_prompt system_prompt|post_history).
  disableUiPrompt?: ("system_prompt" | "post_history_instructions")[];
};

const DECORATOR_LINE = /^@@(\w+)[ \t]*(.*)$/;
const csv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

// Parse leading `@@decorator` lines (RisuAI/CCardLib decorator set, ~30). All
// selection/placement/state decorators are honored; the lines are stripped from
// the body. Unknown decorators are consumed (line removed) with no effect.
export function parseDecorators(content: string): EntryDecorators {
  const out: EntryDecorators = { body: content };
  if (!content.includes("@@")) return out;
  const lines = content.split("\n");
  let i = 0;
  for (; i < lines.length; i++) {
    const m = DECORATOR_LINE.exec(lines[i].trim());
    if (!m) break; // decorators must lead; first non-decorator line ends them
    const name = m[1].toLowerCase();
    const arg = m[2].trim();
    const num = Number(arg);
    switch (name) {
      case "probability":
        if (Number.isFinite(num))
          out.probability = Math.max(0, Math.min(100, num));
        break;
      case "priority":
        if (Number.isFinite(num)) out.priority = num;
        break;
      case "scan_depth":
        if (Number.isFinite(num) && num > 0) out.scanDepth = num;
        break;
      case "additional_keys":
        out.additionalKeys = csv(arg);
        break;
      case "exclude_keys":
        out.excludeKeys = csv(arg);
        break;
      case "exclude_keys_all":
        out.excludeKeysAll = csv(arg);
        break;
      case "depth":
        if (Number.isFinite(num)) {
          out.position = "at_depth";
          out.depth = num;
        }
        break;
      case "reverse_depth":
        if (Number.isFinite(num)) {
          out.position = "at_depth";
          out.depth = num;
          out.reverseDepth = true;
        }
        break;
      case "end":
        out.position = "at_depth";
        out.depth = 0;
        break;
      case "role":
        if (arg === "user" || arg === "assistant" || arg === "system")
          out.role = arg;
        break;
      case "position":
        if (
          ["before_desc", "after_desc", "personality", "scenario"].includes(arg)
        ) {
          out.position = arg as LorebookPlacement;
        }
        break;
      case "match_full_word":
        out.matchWholeWords = true;
        break;
      case "match_partial_word":
        out.matchWholeWords = false;
        break;
      case "activate":
        out.forceState = "activate";
        break;
      case "dont_activate":
        out.forceState = "deactivate";
        break;
      case "keep_activate_after_match":
        out.keepActivateAfterMatch = true;
        break;
      case "dont_activate_after_match":
        out.dontActivateAfterMatch = true;
        break;
      case "activate_only_after":
        if (Number.isFinite(num)) out.activateOnlyAfter = num;
        break;
      case "activate_only_every":
        if (Number.isFinite(num) && num > 0) out.activateOnlyEvery = num;
        break;
      case "is_greeting":
        if (Number.isFinite(num)) out.isGreeting = num;
        break;
      case "recursive":
        out.recursive = true;
        break;
      case "unrecursive":
        out.recursive = false;
        break;
      case "no_recursive_search":
        out.noRecursiveSearch = true;
        break;
      case "ignore_on_max_context":
        out.ignoreOnMaxContext = true;
        break;
      case "inject_lore":
        out.inject = { operation: "append", location: arg, lore: true };
        break;
      case "inject_at":
        out.inject = { operation: "append", location: arg, lore: false };
        break;
      case "inject_replace":
        out.inject = {
          operation: "replace",
          location: out.inject?.location ?? arg,
          lore: out.inject?.lore ?? false,
        };
        break;
      case "inject_prepend":
        out.inject = {
          operation: "prepend",
          location: out.inject?.location ?? arg,
          lore: out.inject?.lore ?? false,
        };
        break;
      case "disable_ui_prompt":
        if (arg === "system_prompt" || arg === "post_history_instructions") {
          (out.disableUiPrompt ??= []).push(arg);
        }
        break;
      default:
        break; // unknown decorator: line consumed, no effect
    }
  }
  out.body = lines.slice(i).join("\n");
  return out;
}

type Prepared = {
  entry: LbEntry;
  dec: EntryDecorators;
  scanText: string; // book scanDepth slice, per entry
  effectivePriority: number;
  // @@probability outcome, rolled ONCE per entry (not per recursion pass).
  probPass: boolean;
};

// Does this entry match the given text, honoring keys / secondary / constant /
// additional / exclude decorators? Per-entry @@match_full_word overrides the
// entry's own whole-word flag.
function entryMatches(p: Prepared, text: string): boolean {
  const e = p.entry;
  const whole = p.dec.matchWholeWords ?? !!e.matchWholeWords;

  // Exclude keys deactivate the entry when present (RisuAI exclude_keys).
  if (p.dec.excludeKeys?.some((k) => keyHits(k, text, whole))) return false;
  // exclude_keys_all: deactivate only when ALL listed keys are present.
  if (
    p.dec.excludeKeysAll &&
    p.dec.excludeKeysAll.length > 0 &&
    p.dec.excludeKeysAll.every((k) => keyHits(k, text, whole))
  ) {
    return false;
  }

  if (e.constant) return true;

  const keys = (e.keys ?? []) as string[];
  if (!keys.some((k) => keyHits(k, text, whole))) return false;

  // Risu additional_keys is an extra POSITIVE query AND-ed with the main keys
  // (any of the additional keys must ALSO match), not more alternatives.
  if (
    p.dec.additionalKeys &&
    p.dec.additionalKeys.length > 0 &&
    !p.dec.additionalKeys.some((k) => keyHits(k, text, whole))
  ) {
    return false;
  }

  if (e.selective) {
    const sec = (e.secondaryKeys ?? []) as string[];
    return sec.length === 0 || sec.some((k) => keyHits(k, text, whole));
  }
  return true;
}

// Chat-length gates (@@activate_only_after / @@activate_only_every /
// @@is_greeting). chatLength = active message count; greetingIndex = which
// first-message is shown (-1 if none). Returns false when a gate blocks.
function passesChatGates(
  dec: EntryDecorators,
  chatLength: number,
  greetingIndex: number,
): boolean {
  if (dec.activateOnlyAfter !== undefined && chatLength < dec.activateOnlyAfter)
    return false;
  if (
    dec.activateOnlyEvery !== undefined &&
    chatLength % dec.activateOnlyEvery !== 0
  )
    return false;
  if (dec.isGreeting !== undefined && greetingIndex !== dec.isGreeting)
    return false;
  return true;
}

export type SelectOpts = {
  // Active message count, for the chat-length gates.
  chatLength?: number;
  // Which first-message/greeting is shown (-1 = none), for @@is_greeting.
  greetingIndex?: number;
  // Per-conversation var store (sticky-match state lives here as
  // __internal_ka_<id> / __internal_da_<id>). Mutated in place; persisted by
  // the caller via the var-writeback channel.
  vars?: Record<string, string>;
  // Per-turn deterministic seed (convId + chat length) for @@probability rolls:
  // stable across regenerates, fresh each turn.
  seed?: string;
};

export function selectLorebookEntries(
  recentUserTexts: string[],
  entries: LbEntry[],
  books: Map<string, LbRow>,
  opts: SelectOpts = {},
): LbEntry[] {
  if (entries.length === 0) return [];
  const chatLength = opts.chatLength ?? recentUserTexts.length;
  const greetingIndex = opts.greetingIndex ?? -1;
  const vars = opts.vars;
  const rollSeed = opts.seed ?? String(chatLength);

  // Global single pool (RisuAI fullLore): every entry competes in one priority
  // ranking under one shared token budget, with one recursion namespace. Each
  // entry keeps its own book's scanDepth for matching only.
  const globalBudget = Math.max(
    ...[...books.values()].map((b) => b.tokenBudget ?? 1500),
    1500,
  );

  const prepared: Prepared[] = entries.map((e) => {
    const book = books.get(e.lorebookId);
    const dec = parseDecorators(e.content);
    const scanDepth = dec.scanDepth ?? book?.scanDepth ?? 4;
    const basePriority = dec.priority ?? e.priority ?? 0;
    return {
      entry: e,
      dec,
      scanText: recentUserTexts.slice(0, scanDepth).join("\n"),
      // ignore_on_max_context floors priority so it sheds first under budget.
      effectivePriority: dec.ignoreOnMaxContext ? -1000 : basePriority,
      // Roll @@probability once, here, so a later recursion pass can't re-roll.
      probPass:
        dec.probability === undefined ||
        seededRand(`${rollSeed}:${e.id}`) * 100 <= dec.probability,
    };
  });

  const globalRecursive = [...books.values()].some((b) => b.recursiveScanning);
  const acceptedIds = new Set<string>();
  const accepted: Prepared[] = [];
  let recursiveText = "";

  const kaKey = (id: string) => `__internal_ka_${id}`;
  const daKey = (id: string) => `__internal_da_${id}`;

  for (let pass = 0; pass < MAX_RECURSIVE_LOREBOOK_PASSES; pass++) {
    let added = 0;
    for (const p of prepared) {
      if (acceptedIds.has(p.entry.id)) continue;
      const id = p.entry.id;

      // Sticky deactivation: once matched-then-suppressed, stays off.
      if (vars?.[daKey(id)] === "true") continue;

      // Chat-length gates.
      if (!passesChatGates(p.dec, chatLength, greetingIndex)) continue;

      // Force state from @@activate / @@dont_activate wins over key matching.
      let active: boolean;
      if (p.dec.forceState === "deactivate") {
        continue;
      } else if (p.dec.forceState === "activate") {
        active = true;
      } else if (vars?.[kaKey(id)] === "true") {
        // Sticky activation: previously matched with keep_activate_after_match.
        active = true;
      } else {
        // On a recursion pass, an entry with @@no_recursive_search only sees the
        // base chat text, not the accumulated lore.
        const text =
          recursiveText && !p.dec.noRecursiveSearch
            ? `${p.scanText}\n${recursiveText}`
            : p.scanText;
        active = entryMatches(p, text);
      }
      if (!active) continue;
      if (!p.probPass) continue;

      acceptedIds.add(id);
      accepted.push(p);
      added++;

      // Persist sticky state for next turn (read on the following request).
      if (vars && p.dec.keepActivateAfterMatch) vars[kaKey(id)] = "true";
      if (vars && p.dec.dontActivateAfterMatch) vars[daKey(id)] = "true";
    }
    if (added === 0 || !globalRecursive) break;
    // Append (not replace) so original chat keys still match on later passes.
    // Per-entry @@unrecursive keeps an accepted entry out of the recursion text.
    recursiveText = accepted
      .filter((p) => p.dec.recursive !== false)
      .map((p) => p.dec.body)
      .join("\n");
  }

  // Single global priority sort, then one shared token budget (RisuAI 603-615).
  accepted.sort((a, b) => b.effectivePriority - a.effectivePriority);
  let used = 0;
  const survived = accepted.filter((p) => {
    const cost = estimateTokens(p.dec.body);
    if (used + cost > globalBudget) return false;
    used += cost;
    return true;
  });

  // Lore-into-lore injection: entries with @@inject_* splice their body into a
  // target entry (matched by comment/name) and drop out of the normal flow.
  const injectors = survived.filter((p) => p.dec.inject);
  const placed = survived.filter((p) => !p.dec.inject);
  for (const inj of injectors) {
    // Target match is by entry id (the stored entry has no comment/name field).
    const target = placed.find((p) => p.entry.id === inj.dec.inject!.location);
    if (!target) continue;
    const op = inj.dec.inject!.operation;
    if (op === "append") target.dec.body = `${target.dec.body} ${inj.dec.body}`;
    else if (op === "prepend")
      target.dec.body = `${inj.dec.body} ${target.dec.body}`;
    else if (op === "replace")
      target.dec.body = target.dec.body.replace(
        inj.dec.inject!.location,
        inj.dec.body,
      );
  }

  // Placement: BOOK binding order first (the order books were attached to the
  // conversation), then per-entry orderIndex, then priority. Without the book
  // rank, two books sharing a position interleave entry-by-entry (A0 B0 A1 B1),
  // scrambling each book's narrative block - the exact failure Risu users hit
  // when two lorebooks share one insertorder value. Decorator placement/role/
  // depth override the entry's stored fields. Return decorator-stripped bodies.
  const bookRank = new Map([...books.keys()].map((id, i) => [id, i]));
  placed.sort(
    (a, b) =>
      (bookRank.get(a.entry.lorebookId) ?? 0) -
        (bookRank.get(b.entry.lorebookId) ?? 0) ||
      (a.entry.orderIndex ?? 0) - (b.entry.orderIndex ?? 0) ||
      b.effectivePriority - a.effectivePriority,
  );
  return placed.map((p) => ({
    ...p.entry,
    content: p.dec.body,
    ...(p.dec.position ? { position: toStoredPosition(p.dec.position) } : {}),
    ...(p.dec.depth !== undefined ? { depth: p.dec.depth } : {}),
    ...(p.dec.role ? { injectionRole: p.dec.role } : {}),
  }));
}

// RisuAI has extra placement names that the stored position enum lacks
// (before_desc/after_desc/personality/scenario). Map them onto the nearest
// stored slot so decorator placement works without widening the schema enum.
function toStoredPosition(pos: LorebookPlacement): LbEntry["position"] {
  switch (pos) {
    case "before_desc":
      return "before_char";
    case "after_desc":
    case "personality":
    case "scenario":
      return "after_char";
    default:
      return pos as LbEntry["position"];
  }
}
