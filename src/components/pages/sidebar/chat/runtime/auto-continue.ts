"use client";

import { readLocalConversationSettings } from "@/lib/db/client/data/chat/chat";
import { analytics } from "@/lib/analytics";
import type { ChatUIMessage } from "@/lib/types";
import { chatStore, speakingCharacterIdAtom } from "@/store/chat-store";

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
  return code >= 0x02b0 && code <= 0x02ff;
}

export async function maybeAutoContinue(
  chat: { sendMessage: (...args: never[]) => Promise<void> },
  remoteId: string | null,
  message: ChatUIMessage,
): Promise<void> {
  if (!remoteId) return;
  if (chatStore.get(speakingCharacterIdAtom) != null) return;
  const text = message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
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
  analytics.chat.autoContinued({ step: depth + 1 });
  await chat.sendMessage();
}
