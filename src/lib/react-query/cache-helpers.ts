/**
 * Pure helpers for React Query `setQueryData` callbacks on flat (non-paginated)
 * lists keyed by `id`. The four RP entities (characters, personas, lorebooks,
 * presets) all share these shapes; without these the same setQueryData closure
 * is copied verbatim ~20 times across rp-hook.ts.
 */

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

// ---------------------------------------------------------------------------
// Paginated message-list helpers (shared by chat-history-adapter + mutations)
// ---------------------------------------------------------------------------

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";

type LooseMsg = { id: string; parentId?: string | null } & Record<
  string,
  unknown
>;
type MessagesPage = { messages: LooseMsg[]; total: number };
type MessagesInfinite = InfiniteData<MessagesPage>;

/**
 * Update every page of the cached `chatMessages(convId)` infinite query by
 * mapping each message through `transform`. Use this for in-place edits where
 * the message count stays the same; for adds/removes use `mutateMessages`.
 */
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

/**
 * Replace each page's `messages` array via `transform`, recomputing `total`.
 * Use for splice-deletes, parentId rewires, full-clear, etc.
 */
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
