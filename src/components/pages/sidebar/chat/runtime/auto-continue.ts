"use client";

import { readLocalConversationSettings } from "@/lib/db/client/data/chat/chat";
import type { ChatUIMessage } from "@/lib/types";
import { chatStore, speakingCharacterIdAtom } from "@/store/chat-store";

// Auto-continue chain depth per conv so a non-terminating model can't loop forever. Reset when a reply terminates.
const autoContinueDepth = new Map<string, number>();
const MAX_AUTO_CONTINUE = 3;

// RisuAI isLastCharPunctuation port: broad set plus U+02B0-02FF; a narrow set causes spurious auto-continues.
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
  userId: number | undefined,
): Promise<void> {
  if (!remoteId) return;
  // Don't auto-continue mid-rotation: the multi-character loop drives its own sends and clears the atom when done.
  if (chatStore.get(speakingCharacterIdAtom) != null) return;
  const text = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("");
  if (!text.trim() || endsTerminally(text)) {
    autoContinueDepth.delete(remoteId);
    return;
  }
  const settings = await readLocalConversationSettings(userId, remoteId);
  if (
    !settings ||
    (settings as { autoContinue?: boolean }).autoContinue !== true
  ) {
    return;
  }
  const depth = autoContinueDepth.get(remoteId) ?? 0;
  if (depth >= MAX_AUTO_CONTINUE) {
    autoContinueDepth.delete(remoteId);
    return;
  }
  autoContinueDepth.set(remoteId, depth + 1);
  // Continuation send, not regenerate: argless sendMessage re-submits history ending on assistant.
  await chat.sendMessage();
}
