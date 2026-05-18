export function listAdd<T>(old: T[] | undefined, item: T): T[] {
  return old ? [...old, item] : [item];
}

export function listUpdate<T extends { id: string }>(
  old: T[] | undefined,
  id: string,
  patch: Partial<T>,
): T[] | undefined {
  return old?.map((it) => (it.id === id ? { ...it, ...patch } : it));
}

export function listRemove<T extends { id: string }>(
  old: T[] | undefined,
  id: string,
): T[] | undefined {
  return old?.filter((it) => it.id !== id);
}

export function itemPatch<T>(
  old: T | undefined,
  patch: Partial<T>,
): T | undefined {
  return old ? { ...old, ...patch } : old;
}

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";

type LooseMsg = { id: string; parentId?: string | null } & Record<
  string,
  unknown
>;
type MessagesPage = { messages: LooseMsg[]; total: number };
type MessagesInfinite = InfiniteData<MessagesPage>;

/** In-place edits where message count stays the same. For adds/removes use
 *  `mutateMessages`. */
export function patchMessages(
  qc: QueryClient,
  convId: string,
  transform: (msg: LooseMsg) => LooseMsg,
) {
  qc.setQueryData<MessagesInfinite>(
    queryKeys.chatMessages(convId),
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((p) => ({
          ...p,
          messages: p.messages.map(transform),
        })),
      },
  );
}

/** Replace each page's `messages` array via `transform`, recomputing `total`.
 *  For splice-deletes, parentId rewires, full-clear, etc. */
export function mutateMessages(
  qc: QueryClient,
  convId: string,
  transform: (messages: LooseMsg[]) => LooseMsg[],
) {
  qc.setQueryData<MessagesInfinite>(
    queryKeys.chatMessages(convId),
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((p) => {
          const messages = transform(p.messages);
          return { ...p, messages, total: messages.length };
        }),
      },
  );
}
