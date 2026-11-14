"use client";

import { readLocalConversationSettings } from "@/lib/db/client/data/chat/chat";
import type { ChatUIMessage } from "@/lib/types";
import { textOf } from "@/lib/ai/chat/pipeline/transforms";
import {
  chatStore,
  rotatingGroupTurnAtom,
  speakingCharacterIdAtom,
} from "@/store/chat-store";

const autoContinueDepth = new Map<string, number>();
const MAX_AUTO_CONTINUE = 3;

const TERMINAL_PUNCTUATION = new Set([
  ".",
  "!",
  "?",
  "。",
  "！",
  "？",
  "…",
  "@",
  "#",
  "$",
  "%",
  "^",
  "&",
  "*",
  "(",
  ")",
  "-",
  "_",
  "+",
  "=",
  "{",
  "}",
  "[",
  "]",
  "|",
  "\\",
  ":",
  ";",
  "<",
  ">",
  ",",
  "/",
  "~",
  "`",
  " ",
  "¡",
  "¿",
  "‽",
  "⁉",
  "'",
  '"',
  "”",
  "’",
  "】",
  "」",
  "』",
]);

function endsTerminally(text: string): boolean {
  const last = text.trim().at(-1);
  if (!last) return true;
  if (TERMINAL_PUNCTUATION.has(last)) return true;
  const code = last.charCodeAt(0);
  return (
    // spacing modifier letters
    (code >= 0x02b0 && code <= 0x02ff) ||
    // combining diacritical marks
    (code >= 0x0300 && code <= 0x036f) ||
    // hebrew punctuation
    (code >= 0x0590 && code <= 0x05cf) ||
    // CJK symbols and punctuation
    (code >= 0x3000 && code <= 0x303f)
  );
}

export async function maybeAutoContinue(
  chat: { sendMessage: (...args: never[]) => Promise<void> },
  remoteId: string | null,
  message: ChatUIMessage,
): Promise<void> {
  if (!remoteId) return;
  if (chatStore.get(speakingCharacterIdAtom) != null) return;
  if (chatStore.get(rotatingGroupTurnAtom)) return;
  // The atoms above are cleared in the rotation loop's finally, which can run
  // before the last character's onFinish: the message itself is the only
  // reliable witness that this generation belonged to a group turn.
  if (message.metadata?.speakingCharacterId != null) return;
  const text = textOf(message.parts);
  if (!text.trim() || endsTerminally(text)) {
    autoContinueDepth.delete(remoteId);
    return;
  }
  const settings = await readLocalConversationSettings(remoteId);
  if (!settings || settings.autoContinue !== true) return;
  const depth = autoContinueDepth.get(remoteId) ?? 0;
  if (depth >= MAX_AUTO_CONTINUE) {
    autoContinueDepth.delete(remoteId);
    return;
  }
  autoContinueDepth.set(remoteId, depth + 1);
  await chat.sendMessage();
}
