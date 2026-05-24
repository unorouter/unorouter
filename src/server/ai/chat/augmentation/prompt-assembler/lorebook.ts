import { encode } from "gpt-tokenizer";
import { MAX_RECURSIVE_LOREBOOK_PASSES } from "@/lib/config/constants";
import type { LbEntry, LbRow } from "@/lib/types";
import { escapeRegex } from "@/lib/utils/base";

export function keyHits(
  key: string,
  text: string,
  wholeWords: boolean,
): boolean {
  if (!key) return false;
  if (wholeWords) {
    return new RegExp(`\\b${escapeRegex(key)}\\b`, "i").test(text);
  }
  return text.toLowerCase().includes(key.toLowerCase());
}

// gpt-tokenizer (cl100k_base) is off by ~10-20% on Claude/Gemini, fine here.
function estimateTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
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

    for (let pass = 0; pass < MAX_RECURSIVE_LOREBOOK_PASSES; pass++) {
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
