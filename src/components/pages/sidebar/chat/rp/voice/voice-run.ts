"use client";

import {
  conversationStore,
  messageStore,
  readPrimaryCharacter,
} from "@/lib/db/client/data/chat/chat";
import { characterStore } from "@/lib/db/client/data/rp/rp";
import { readLocalVoiceSettings } from "@/lib/db/client/data/voice";
import {
  AUDIO_BLOCKED,
  speak,
  unlockVoice,
} from "@/components/pages/sidebar/chat/rp/voice/speak";

// The speaking character's own voice wins over the default, which is what gives
// a group chat one voice per character. Only group turns record a speaker, so a
// one-on-one reply falls back to the chat's own character.
export async function speakMessage(
  messageId: string,
  text: string,
  characterId?: string | null,
): Promise<void> {
  void unlockVoice().catch(() => {});
  const settings = await readLocalVoiceSettings();
  if (!settings?.apiKey) return;
  const message = characterId ? null : await messageStore.get(messageId);
  const speakerId = characterId ?? message?.characterId ?? null;
  const character = speakerId
    ? await characterStore.get(speakerId)
    : message
      ? await readPrimaryCharacter(message.convId)
      : null;
  const speed = character?.voiceSpeed ?? settings.speed;
  await speak(
    messageId,
    { ...settings, speed },
    text,
    character?.voiceId ?? null,
  );
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
  // Autoplay without a tap is expected to be refused; only a tap reports it.
  await speakMessage(messageId, text, characterId).catch((e) => {
    if (!(e instanceof Error && e.message === AUDIO_BLOCKED)) throw e;
  });
}
