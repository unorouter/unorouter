import { walkActiveBranch } from "@/lib/ai/chat/messages";
import { uid } from "@/lib/utils/base";
import {
  readLocalConversationBundle,
  upsertLocalConversationBundle,
} from "@/lib/db/client/data/chat/chat";

type AnyRow = Record<string, unknown>;

export async function forkConversationFromMessage(
  convId: string,
  messageId: string,
): Promise<{ id: string }> {
  const bundle = await readLocalConversationBundle(convId);
  if (!bundle) throw new Error("conversation not found");

  const path = walkActiveBranch(
    bundle.messages as Array<{
      id: string;
      parentId: string | null;
      isActiveBranch?: boolean | null;
    }>,
  ).path;
  const cut = path.findIndex((m) => m.id === messageId);
  const kept = cut >= 0 ? path.slice(0, cut + 1) : path;
  const keptIds = new Set(kept.map((m) => m.id));

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

  const items = (bundle.messageItems as AnyRow[])
    .filter((it) => keptIds.has(it.messageId as string))
    .map((it) => ({
      ...it,
      id: uid(),
      messageId: msgIdMap.get(it.messageId as string)!,
    }));

  const srcConv = bundle.conversation as AnyRow;
  const baseTitle = (srcConv.title as string | null) ?? "";
  const conversation = {
    ...srcConv,
    id: newConvId,
    title: baseTitle ? `${baseTitle} (branch)` : null,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
  };

  const conversationCharacters = (
    bundle.conversationCharacters as AnyRow[]
  ).map((b) => ({ ...b, convId: newConvId }));
  const conversationLorebooks = (bundle.conversationLorebooks as AnyRow[]).map(
    (b) => ({ ...b, convId: newConvId }),
  );

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
