import type { ConversationWithModel } from "@/lib/db/schema/rows";
import type { InfiniteData } from "@tanstack/react-query";

// A conversation list item is the local DB row (with the model column
// flattened in) - this app is local-first, the SQLocal row is canonical.
export type ConvItem = ConversationWithModel;
export type ConvsData = {
  items: ConvItem[];
  total: number;
  page: number;
  pageSize: number;
};
export type ConvsInfinite = InfiniteData<ConvsData>;

export function prependConv(
  old: ConvsInfinite | undefined,
  item: ConvItem,
): ConvsInfinite | undefined {
  if (!old?.pages[0]) return old;
  const first = old.pages[0];
  return {
    ...old,
    pages: [
      { ...first, total: first.total + 1, items: [item, ...first.items] },
      ...old.pages.slice(1),
    ],
  };
}

export function patchConv(
  old: ConvsInfinite | undefined,
  id: string,
  patch: Partial<ConvItem>,
): ConvsInfinite | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((p) => ({
      ...p,
      items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
  };
}

export function removeConv(
  old: ConvsInfinite | undefined,
  id: string,
): ConvsInfinite | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((p) => ({
      ...p,
      total: p.total - 1,
      items: p.items.filter((i) => i.id !== id),
    })),
  };
}

/** Moves a conversation to the top of the list, applying an optional patch derived from the current item. */
export function moveConvToTop(
  old: ConvsInfinite | undefined,
  id: string,
  patchFn?: (item: ConvItem) => Partial<ConvItem>,
): ConvsInfinite | undefined {
  if (!old) return old;
  let target: ConvItem | undefined;
  const without = old.pages.map((p) => ({
    ...p,
    items: p.items.filter((i) => {
      if (i.id !== id) return true;
      target = patchFn ? { ...i, ...patchFn(i) } : { ...i };
      return false;
    }),
  }));
  if (!target) return old;
  return {
    ...old,
    pages: [
      { ...without[0], items: [target, ...without[0].items] },
      ...without.slice(1),
    ],
  };
}
