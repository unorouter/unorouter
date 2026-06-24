import { countTokens } from "@/lib/ai/chat/tokenizer";
import { MAX_RECURSIVE_LOREBOOK_PASSES } from "@/lib/config/constants";
import type { LbEntry, LbRow } from "@/lib/types";
import { escapeRegex } from "@/lib/utils/base";
import { seededRand } from "@/lib/ai/chat/calc";

// Strip {{//...}} and {{comment:...}} from scan text before matching; hidden comments never trigger keys.
function stripComments(text: string): string {
  return text
    .replace(/\{\{\/\/(.+?)\}\}/g, "")
    .replace(/\{\{comment:(.+?)\}\}/g, "");
}

// Compiled-key cache: big lorebooks re-test the same keys every turn. null is an invalid pattern, cached so it isn't retried.
const KEY_RE_CACHE = new Map<string, RegExp | null>();
function compiledKey(cacheKey: string, build: () => RegExp): RegExp | null {
  let re = KEY_RE_CACHE.get(cacheKey);
  if (re === undefined) {
    try {
      re = build();
    } catch {
      re = null;
    }
    if (KEY_RE_CACHE.size > 2000) KEY_RE_CACHE.clear();
    KEY_RE_CACHE.set(cacheKey, re);
  }
  return re;
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
    const re = compiledKey(
      `r:${key}`,
      () => new RegExp(key.slice(1, lastSlash), key.slice(lastSlash + 1)),
    );
    return re ? re.test(text) : false;
  }
  const cleaned = stripComments(text);
  if (wholeWords) {
    const re = compiledKey(
      `w:${key}`,
      () => new RegExp(`\\b${escapeRegex(key)}\\b`, "i"),
    );
    return re ? re.test(cleaned) : false;
  }
  // Risu partial matching strips all spaces from both sides, so multi-word keys match regardless of spacing.
  return cleaned
    .toLowerCase()
    .replace(/ /g, "")
    .includes(key.toLowerCase().replace(/ /g, ""));
}

// Counts against the active per-model tokenizer (preloaded in assemble-prompt).
function estimateTokens(text: string): number {
  return countTokens(text);
}

// Per-entry overrides parsed from @@decorator lines atop an entry's content; those lines are stripped from body.
export type EntryDecorators = {
  body: string;
  probability?: number;
  priority?: number;
  // Risu insertorder override; higher = earlier in the single lorebook slot.
  order?: number;
  scanDepth?: number;
  additionalKeys?: string[];
  excludeKeys?: string[];
  excludeKeysAll?: string[];
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
  // Lore-into-lore injection (@@inject_*). location is the target entry's comment/name.
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

// Parse leading @@decorator lines, stripped from the body; unknown decorators are consumed with no effect.
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
      case "order":
      case "insertorder":
        if (Number.isFinite(num)) out.order = num;
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
      case "role":
        if (arg === "user" || arg === "assistant" || arg === "system")
          out.role = arg;
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

// Key/secondary/constant/additional/exclude matching; @@match_full_word overrides the entry flag.
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

  const keys = e.keys ?? [];
  if (!keys.some((k) => keyHits(k, text, whole))) return false;

  // Risu additional_keys is AND-ed with the main keys (any additional key must ALSO match), not more alternatives.
  if (
    p.dec.additionalKeys &&
    p.dec.additionalKeys.length > 0 &&
    !p.dec.additionalKeys.some((k) => keyHits(k, text, whole))
  ) {
    return false;
  }

  if (e.selective) {
    const sec = e.secondaryKeys ?? [];
    return sec.length === 0 || sec.some((k) => keyHits(k, text, whole));
  }
  return true;
}

// @@activate_only_after / @@activate_only_every / @@is_greeting gates.
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
  // Shown greeting index (-1 = none), for @@is_greeting.
  greetingIndex?: number;
  // Per-conv var store; sticky-match state mutates in place, caller persists via var writeback.
  vars?: Record<string, string>;
  // Per-turn seed for @@probability: stable across regenerates, fresh each turn.
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

  // Single global pool (RisuAI fullLore): one priority ranking, one token budget, one recursion namespace. Per-book scanDepth only for matching.
  const globalBudget = Math.max(
    ...[...books.values()].map((b) => b.tokenBudget ?? 1500),
    1500,
  );

  // Defense for loose client payloads; the Turso path already filters in SQL.
  const enabledEntries = entries.filter(
    (e) => (e as { enabled?: boolean | null }).enabled !== false,
  );
  const prepared: Prepared[] = enabledEntries.map((e) => {
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
        // On a recursion pass, @@no_recursive_search entries only see the base chat text, not accumulated lore.
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
    // Append, not replace, so original chat keys still match later. @@unrecursive keeps an entry out of the recursion text.
    recursiveText = accepted
      .filter((p) => p.dec.recursive !== false)
      .map((p) => p.dec.body)
      .join("\n");
  }

  // Single global priority sort, then one shared token budget (RisuAI 603-615). Id tiebreak keeps the survival set deterministic.
  accepted.sort(
    (a, b) =>
      b.effectivePriority - a.effectivePriority ||
      (a.entry.id < b.entry.id ? -1 : 1),
  );
  let used = 0;
  const survived = accepted.filter((p) => {
    const cost = estimateTokens(p.dec.body);
    if (used + cost > globalBudget) return false;
    used += cost;
    return true;
  });

  // @@inject_* entries splice their body into a target entry (matched by comment/name) and drop out of normal flow.
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

  // Single lorebook slot: order purely by orderIndex DESC (insert order, higher = earlier), then priority DESC, then id for determinism.
  const order = (p: Prepared) => p.dec.order ?? p.entry.orderIndex ?? 0;
  placed.sort(
    (a, b) =>
      order(b) - order(a) ||
      b.effectivePriority - a.effectivePriority ||
      (a.entry.id < b.entry.id ? -1 : 1),
  );
  return placed.map((p) => ({
    ...p.entry,
    content: p.dec.body,
    ...(p.dec.role ? { injectionRole: p.dec.role } : {}),
  }));
}
