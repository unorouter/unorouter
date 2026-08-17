"use client";

import { groupOrder } from "@/lib/ai/chat/group-order";
import {
  readLocalConversationBindings,
  readLocalConversationSettings,
  readLocalMessages,
} from "@/lib/db/client/data/chat/chat";
import { readLocalCharacter } from "@/lib/db/client/data/rp/rp";

function sendArgText(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg && typeof arg === "object") {
    const o = arg as {
      text?: string;
      parts?: { type: string; text?: string }[];
    };
    if (typeof o.text === "string") return o.text;
    if (Array.isArray(o.parts)) {
      return o.parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join(" ");
    }
  }
  return "";
}

export async function computeSpeakingOrder(
  convId: string,
  sendArg: unknown,
): Promise<string[]> {
  const settings = await readLocalConversationSettings(convId);
  const bindings = await readLocalConversationBindings(convId);
  const active = (bindings?.conversationCharacters ?? []).filter(
    (b) => b.isActive !== false,
  );
  if (active.length <= 1) return active.map((b) => b.characterId);

  const members = await Promise.all(
    active.map(async (b) => {
      const ch = await readLocalCharacter(b.characterId);
      return {
        id: b.characterId,
        name: (ch as { name?: string } | null)?.name ?? "",
        talkness:
          typeof (b as { talkness?: number }).talkness === "number"
            ? (b as { talkness: number }).talkness
            : null,
        orderIndex: b.orderIndex ?? 0,
      };
    }),
  );
  const rows = await readLocalMessages(convId);
  const lastSpeakerId =
    [...(rows ?? [])]
      .reverse()
      .find((m) => m.role === "assistant" && m.characterId)?.characterId ??
    null;
  return groupOrder(members, sendArgText(sendArg), {
    orderByOrder:
      (settings as { groupOrderByOrder?: boolean } | null)
        ?.groupOrderByOrder === true,
    lastSpeakerId,
  }).map((m) => m.id);
}
