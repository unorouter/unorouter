"use client";

import {
  activeConvOverridesAtom,
  chatDefaultsAtom,
  chatGroupAtom,
  chatLoadoutAtom,
  chatModelAtom,
  chatStore,
  chatWebSearchAtom,
  globalVarsAtom,
  localUserIdAtom,
  speakingCharacterIdAtom,
} from "@/store/chat-store";

export async function buildChatRequestBody(getConvId: () => string | null) {
  const userId = chatStore.get(localUserIdAtom);
  const convId = getConvId();
  const loadout = chatStore.get(chatLoadoutAtom);
  const chatContext = convId
    ? await import("@/lib/db/client/data/chat/chat-context").then((m) =>
        m.buildChatContextFromLocalDb(userId, convId, {
          expectBindings:
            loadout.characterIds.length > 0 || loadout.lorebookIds.length > 0,
        }),
      )
    : undefined;
  let messageTimes: Record<string, number> | undefined;
  if (convId) {
    const rows = await import("@/lib/db/client/data/chat/chat").then((m) =>
      m.readLocalMessages(userId, convId),
    );
    if (rows && rows.length > 0) {
      messageTimes = {};
      for (const r of rows) {
        messageTimes[r.id] = new Date(r.createdAt).getTime();
      }
    }
  }
  return {
    model: chatStore.get(chatModelAtom),
    convId,
    webSearch: chatStore.get(chatWebSearchAtom),
    group: chatStore.get(chatGroupAtom),
    overrides:
      chatStore.get(activeConvOverridesAtom) ?? chatStore.get(chatDefaultsAtom),
    chatContext,
    globalVars: chatStore.get(globalVarsAtom),
    speakingCharacterId: chatStore.get(speakingCharacterIdAtom),
    messageTimes,
    clientEnv: {
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };
}
