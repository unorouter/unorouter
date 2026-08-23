import { walkActiveBranch } from "@/lib/ai/chat/messages";
import { uid } from "@/lib/utils/base";
import {
  readLocalConversationBundle,
  upsertLocalConversationBundle,
} from "@/lib/db/client/data/chat/chat";

export async function forkConversationFromMessage(
  convId: string,
  messageId: string,
): Promise<{ id: string }> {
  const bundle = await readLocalConversationBundle(convId);
  if (!bundle) throw new Error("conversation not found");

  const path = walkActiveBranch(bundle.messages).path;
  const cut = path.findIndex((m) => m.id === messageId);
  const kept = cut >= 0 ? path.slice(0, cut + 1) : path;
  const keptIds = new Set(kept.map((m) => m.id));

  const msgIdMap = new Map<string, string>();
  for (const m of kept) msgIdMap.set(m.id, uid());
  const newConvId = uid();

  const keptRows = bundle.messages.filter((m) => keptIds.has(m.id));
  const messages = keptRows.map((m) => {
    const oldParent = m.parentId;
    return {
      ...m,
      id: msgIdMap.get(m.id)!,
      convId: newConvId,
      parentId: oldParent ? (msgIdMap.get(oldParent) ?? null) : null,
    };
  });

  const items = bundle.messageItems
    .filter((it) => keptIds.has(it.messageId))
    .map((it) => ({
      ...it,
      id: uid(),
      messageId: msgIdMap.get(it.messageId)!,
    }));

  const srcConv = bundle.conversation;
  const baseTitle = srcConv.title ?? "";
  const conversation = {
    ...srcConv,
    id: newConvId,
    title: baseTitle ? `${baseTitle} (branch)` : null,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
  };

  const conversationCharacters = bundle.conversationCharacters.map((b) => ({
    ...b,
    convId: newConvId,
  }));
  const conversationLorebooks = bundle.conversationLorebooks.map((b) => ({
    ...b,
    convId: newConvId,
  }));

  await upsertLocalConversationBundle({
    conversation,
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
