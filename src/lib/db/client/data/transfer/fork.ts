// Fork a chat from a message into a NEW conversation: clone the active-branch messages UP TO AND INCLUDING
// the target message into a fresh conversation, re-pointing the SAME bound entities (characters/lorebooks/
// persona/preset) - no entity deep-copy. Pure client-first; reuses the conversation bundle read + writer.
//
// Media: inlay images are looked up by id (readLocalMedia is id-only, not conv-scoped), so the forked
// messages' {{inlay::id}} tokens resolve the original shared media rows - no media copy needed. (Edge: if
// the original conversation is later deleted its media cascades, breaking the fork's images. Acceptable v1.)

import { walkActiveBranch } from "@/lib/ai/chat/messages";
import { uid } from "@/lib/utils/base";
import {
  readLocalConversationBundle,
  upsertLocalConversationBundle,
} from "../chat";

type AnyRow = Record<string, unknown>;

export async function forkConversationFromMessage(
  userId: number | undefined,
  convId: string,
  messageId: string,
): Promise<{ id: string }> {
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) throw new Error("conversation not found");

  // Active-branch path (tip -> root), then keep everything up to AND including the target message.
  const path = walkActiveBranch(
    bundle.messages as Array<{
      id: string;
      parentId: string | null;
      isActiveBranch?: boolean | null;
    }>,
  ).path;
  const cut = path.findIndex((m) => m.id === messageId);
  // Target not on the active path -> fall back to the full active path.
  const kept = cut >= 0 ? path.slice(0, cut + 1) : path;
  const keptIds = new Set(kept.map((m) => m.id));

  // Re-ID the kept messages; remap parentId through the same map (a parent dropped by the slice -> null root).
  const msgIdMap = new Map<string, string>();
  for (const m of kept) msgIdMap.set(m.id, uid());
  const newConvId = uid();

  const keptRows = (bundle.messages as AnyRow[]).filter((m) =>
    keptIds.has(m.id as string),
  );
  const messages = keptRows.map((m) => {
    const oldParent = m.parentId as string | null;
    return {
      ...m,
      id: msgIdMap.get(m.id as string)!,
      convId: newConvId,
      parentId: oldParent ? (msgIdMap.get(oldParent) ?? null) : null,
    };
  });

  // Items of the kept messages: new ids, remapped messageId.
  const items = (bundle.messageItems as AnyRow[])
    .filter((it) => keptIds.has(it.messageId as string))
    .map((it) => ({
      ...it,
      id: uid(),
      messageId: msgIdMap.get(it.messageId as string)!,
    }));

  // New conversation row: clone, fresh id, suffixed title, zeroed running totals (the slice may differ).
  const srcConv = bundle.conversation as AnyRow;
  const baseTitle = (srcConv.title as string | null) ?? "";
  const conversation = {
    ...srcConv,
    id: newConvId,
    title: baseTitle ? `${baseTitle} (branch)` : null,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    syncExpiresAt: null,
  };

  // Bindings re-point to the SAME entity ids (just the new convId); no new entity rows are created.
  const conversationCharacters = (
    bundle.conversationCharacters as AnyRow[]
  ).map((b) => ({ ...b, convId: newConvId }));
  const conversationLorebooks = (bundle.conversationLorebooks as AnyRow[]).map(
    (b) => ({ ...b, convId: newConvId }),
  );

  await upsertLocalConversationBundle(userId, {
    conversation,
    // Settings live as columns on the conversation row; the bundle's settings is the same projection,
    // already folded into `conversation` via the spread. Pass null to avoid double-applying.
    settings: null,
    conversationCharacters,
    conversationLorebooks,
    messages,
    messageItems: items,
    media: [],
    requestLogs: [],
  });

  return { id: newConvId };
}
