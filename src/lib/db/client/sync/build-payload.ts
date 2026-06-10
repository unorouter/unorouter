"use client";

import {
  readLocalConversation,
  readLocalConversationBindings,
  readLocalConversationBundle,
  readLocalMessageItemsByMsgIds,
  readLocalMessagesByIds,
} from "@/lib/db/client/data/chat";
import { readLocalGenerationSessionBundle } from "@/lib/db/client/data/playground";
import {
  readLocalCard,
  readLocalCharacter,
  readLocalLorebook,
  readLocalPersona,
  readLocalPreset,
} from "@/lib/db/client/data/rp";
import { readLocalTheme } from "@/lib/db/client/data/theme";
import type { SyncMergeMode } from "@/lib/validation/sync";
import type { SyncKindName } from "@/lib/validation/sync-constants";

// Conversation outbox scopes. "full" absorbs the rest; the others compose
// into partial pushes so a rename or drawer save never re-uploads the bundle.
export type ConvSyncHint = "full" | "row" | "bindings" | "msgs";

export type SyncPush = { payload: unknown; mergeMode?: SyncMergeMode };

// Cascade payload per kind; shared by add/resync + the outbox drainer.
export async function buildSyncPayload(
  userId: number,
  kind: SyncKindName,
  id: string,
): Promise<unknown> {
  switch (kind) {
    case "conversations": {
      const bundle = await readLocalConversationBundle(userId, id);
      // Settings ride the conversation row; request logs are server-persisted.
      return (
        bundle && { ...bundle, settings: undefined, requestLogs: undefined }
      );
    }
    case "playgroundSessions":
      return readLocalGenerationSessionBundle(userId, id);
    case "lorebooks": {
      const lb = await readLocalLorebook(userId, id);
      return (
        lb && { lorebook: { ...lb, entries: undefined }, entries: lb.entries }
      );
    }
    case "cards": {
      const card = await readLocalCard(userId, id);
      return (
        card && {
          card: {
            ...card,
            cardCharacters: undefined,
            cardLorebooks: undefined,
          },
          cardCharacters: card.cardCharacters,
          cardLorebooks: card.cardLorebooks,
        }
      );
    }
    case "characters":
      return readLocalCharacter(userId, id);
    case "personas":
      return readLocalPersona(userId, id);
    case "presets":
      return readLocalPreset(userId, id);
    case "theme": {
      const themeJson = await readLocalTheme(userId);
      return themeJson && { themeJson };
    }
  }
}

// Drain-time payload(s) rebuilt from local DB; null when the row was deleted.
// Conversations with partial hints expand to two pushes: an upsert (row patch +
// message deltas, never wipes absent siblings) and a join-table-scoped replace.
export async function buildPendingPushes(
  userId: number,
  kind: SyncKindName,
  id: string,
  hints: Set<ConvSyncHint>,
  msgIds: string[],
): Promise<SyncPush[] | null> {
  const partial =
    kind === "conversations" && hints.size > 0 && !hints.has("full");
  if (!partial) {
    const payload = await buildSyncPayload(userId, kind, id);
    return payload == null ? null : [{ payload }];
  }

  const pushes: SyncPush[] = [];
  const upsert: Record<string, unknown> = {};
  if (hints.has("row")) {
    const conv = await readLocalConversation(userId, id);
    if (!conv) return null;
    upsert.conversation = conv;
  }
  if (hints.has("msgs") && msgIds.length > 0) {
    upsert.messages = await readLocalMessagesByIds(userId, msgIds);
    upsert.messageItems = await readLocalMessageItemsByMsgIds(userId, msgIds);
  }
  if (Object.keys(upsert).length > 0) {
    pushes.push({ payload: upsert, mergeMode: "upsert" });
  }
  if (hints.has("bindings")) {
    const bindings = await readLocalConversationBindings(userId, id);
    if (bindings) pushes.push({ payload: bindings, mergeMode: "replace" });
  }
  return pushes;
}
