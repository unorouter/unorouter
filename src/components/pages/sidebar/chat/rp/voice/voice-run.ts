"use client";

import {
  conversationStore,
  messageStore,
} from "@/lib/db/client/data/chat/chat";
import { characterStore } from "@/lib/db/client/data/rp/rp";
import { readLocalVoiceSettings } from "@/lib/db/client/data/voice";
import { speak } from "@/components/pages/sidebar/chat/rp/voice/speak";

// The speaking character's own voice wins over the default, which is what gives
// a group chat one voice per character.
export async function speakMessage(
  messageId: string,
  text: string,
  characterId?: string | null,
): Promise<void> {
  const settings = await readLocalVoiceSettings();
  if (!settings?.apiKey) return;
  const charId =
    characterId ?? (await messageStore.get(messageId))?.characterId ?? null;
  const character = charId ? await characterStore.get(charId) : null;
  await speak(messageId, settings, text, character?.voiceId ?? null);
}

export async function autoplayReply(
  convId: string,
  messageId: string,
  text: string,
  characterId: string | null,
): Promise<void> {
  const settings = await readLocalVoiceSettings();
  if (!settings?.autoplay || !settings.apiKey) return;
  if ((await conversationStore.get(convId))?.voiceEnabled === false) return;
  await speakMessage(messageId, text, characterId);
}
