"use client";

import { readLocalMessage } from "@/lib/db/client/data/chat/chat";
import { readLocalCharacter } from "@/lib/db/client/data/rp/rp";
import { readLocalVoiceSettings } from "@/lib/db/client/data/voice";
import { playingVoiceAtom, speak, stopVoice } from "@/lib/ai/voice/speak";
import { chatStore } from "@/store/chat-store";

const setPlaying = (key: string | null) => chatStore.set(playingVoiceAtom, key);

export const stopMessageVoice = () => stopVoice(setPlaying);

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
    characterId ?? (await readLocalMessage(messageId))?.characterId ?? null;
  const character = charId ? await readLocalCharacter(charId) : null;
  await speak(
    messageId,
    settings,
    text,
    character?.voiceId ?? null,
    setPlaying,
  );
}

export async function autoplayReply(
  messageId: string,
  text: string,
  characterId: string | null,
): Promise<void> {
  const settings = await readLocalVoiceSettings();
  if (!settings?.autoplay || !settings.apiKey) return;
  await speakMessage(messageId, text, characterId);
}
