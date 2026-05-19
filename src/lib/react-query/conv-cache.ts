import type { rpc } from "@/lib/rpc";
import type { EdenResponse } from "@/lib/types/eden";
import type { InfiniteData } from "@tanstack/react-query";

export type ConvsData = Extract<
  EdenResponse<{ get: typeof rpc.api.ai.chat.conversations.get }, "get">,
  { page: number }
>;
export type ConvItem = ConvsData["items"][number];
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
