import { seededRand } from "./calc";

export type GroupMember = {
  id: string;
  name: string;
  talkness: number | null;
  orderIndex: number;
};

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

  if (opts.orderByOrder) {
    return [...members].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const order: GroupMember[] = [];
  const taken = new Set<string>();

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

  for (const m of members) {
    if (taken.has(m.id)) continue;
    if (seededRand(`${m.id}:${lastUserText}`) <= (m.talkness ?? 0.5)) {
      order.push(m);
      taken.add(m.id);
    }
  }

  if (order.length === 0) order.push(members[0]);

  const filtered = order.filter((m) => m.id !== opts.lastSpeakerId);
  return filtered.length > 0 ? filtered : order;
}
