    // Multi-character turn ordering (RisuAI groupOrder port): name-mention priority, then weighted-random talkativeness. Random mode excludes the last speaker; seeded rolls stay stable across regenerates.

import { seededRand } from "./calc";

export type GroupMember = {
  id: string;
  name: string;
  // [0,1] probability the character speaks when not name-mentioned.
  talkness: number | null;
  // Stored order index (deterministic mode).
  orderIndex: number;
};

// Risu getWords: split on newlines/spaces, lowercase.
function getWords(text: string): string[] {
  return text
    .split(/\n| /)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

export function groupOrder(
  members: GroupMember[],
  lastUserText: string,
  opts: { orderByOrder?: boolean; lastSpeakerId?: string | null } = {},
): GroupMember[] {
  if (members.length === 0) return [];

      // Deterministic mode: stored order, every member, no last-speaker filter (Risu only filters in random mode).
  if (opts.orderByOrder) {
    return [...members].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const order: GroupMember[] = [];
  const taken = new Set<string>();

      // Stage 1: name-mention priority in mention order. Risu compares each text word against the name's word chunks, so partial and multi-word names match.
  const words = getWords(lastUserText);
  for (const w of words) {
    const hit = members.find(
      (m) => !taken.has(m.id) && m.name && getWords(m.name).includes(w),
    );
    if (hit) {
      order.push(hit);
      taken.add(hit.id);
    }
  }

      // Stage 2: weighted-random fill (seeded by member id + user text so the same turn rolls the same speakers across regenerates). Risu default 0.5.
  for (const m of members) {
    if (taken.has(m.id)) continue;
    if (seededRand(`${m.id}:${lastUserText}`) <= (m.talkness ?? 0.5)) {
      order.push(m);
      taken.add(m.id);
    }
  }

  // Guarantee at least one speaker (Risu while-loop fallback).
  if (order.length === 0) order.push(members[0]);

  // No back-to-back: drop the last speaker unless that empties the order.
  const filtered = order.filter((m) => m.id !== opts.lastSpeakerId);
  return filtered.length > 0 ? filtered : order;
}
