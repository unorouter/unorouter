import type { ChatGroupRow } from "@/lib/db/schema/rows";

export const MAX_GROUP_DEPTH = 3;

export type GroupNode = { group: ChatGroupRow; children: GroupNode[] };

const byOrder = (a: ChatGroupRow, b: ChatGroupRow) =>
  a.orderIndex - b.orderIndex ||
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

// Rows whose parent no longer exists render at the top level instead of
// vanishing.
export function buildGroupTree(groups: ChatGroupRow[]): GroupNode[] {
  const ids = new Set(groups.map((g) => g.id));
  const nodes = new Map(
    groups.map((g): [string, GroupNode] => [g.id, { group: g, children: [] }]),
  );
  const roots: GroupNode[] = [];
  for (const g of [...groups].sort(byOrder)) {
    const node = nodes.get(g.id)!;
    const parent = g.parentId && ids.has(g.parentId) ? nodes.get(g.parentId) : null;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

export function flattenGroupTree(
  tree: GroupNode[],
  depth = 1,
): { group: ChatGroupRow; depth: number }[] {
  return tree.flatMap((n) => [
    { group: n.group, depth },
    ...flattenGroupTree(n.children, depth + 1),
  ]);
}

export function groupDepth(groups: ChatGroupRow[], id: string): number {
  const byId = new Map(groups.map((g) => [g.id, g]));
  let depth = 0;
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    depth += 1;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return depth;
}

export function subtreeHeight(groups: ChatGroupRow[], id: string): number {
  const kids = groups.filter((g) => g.parentId === id);
  return 1 + Math.max(0, ...kids.map((k) => subtreeHeight(groups, k.id)));
}

export function isDescendant(
  groups: ChatGroupRow[],
  ancestorId: string,
  id: string,
): boolean {
  const byId = new Map(groups.map((g) => [g.id, g]));
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.id)) {
    if (cur.parentId === ancestorId) return true;
    seen.add(cur.id);
    cur = byId.get(cur.parentId);
  }
  return false;
}

// Targets a group may be moved into: not itself, not its own subtree, and
// never past MAX_GROUP_DEPTH once its own subtree hangs under the target.
export function canNestUnder(
  groups: ChatGroupRow[],
  groupId: string,
  targetId: string,
): boolean {
  if (targetId === groupId || isDescendant(groups, groupId, targetId))
    return false;
  return (
    groupDepth(groups, targetId) + subtreeHeight(groups, groupId) <=
    MAX_GROUP_DEPTH
  );
}
