"use client";

import { useMessagesQuery } from "@/hooks/ai/chat-hook";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import {
  useChatBindingsQuery,
  useChatSettingsQuery,
} from "@/hooks/ai/rp/conversations";
import { useLorebooksQuery } from "@/hooks/ai/rp/lorebooks";
import { usePresetsQuery } from "@/hooks/ai/rp/presets";
import type { ApiMessage } from "@/lib/ai/chat/messages";
import { chatDefaultsAtom, chatLoadoutAtom } from "@/store/chat-store";
import { useAuiState } from "@assistant-ui/react";
import { useAtomValue } from "jotai";

type MessageMeta = {
  model: string | null;
  characterId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
};

const byIdCache = new WeakMap<ApiMessage[], Map<string, ApiMessage>>();

function messagesById(list: ApiMessage[]): Map<string, ApiMessage> {
  let byId = byIdCache.get(list);
  if (!byId) {
    byId = new Map(list.map((m) => [m.id, m]));
    byIdCache.set(list, byId);
  }
  return byId;
}

export function useMessageMeta(): MessageMeta | null {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const messageId = useAuiState((s) => s.message.id);
  const messagesQuery = useMessagesQuery(remoteId ?? undefined);

  if (!messagesQuery.data) return null;

  // Id match only: a positional fallback (render index into the flat DB list)
  // showed the WRONG row's model/cost on branched threads. An optimistic id
  // that misses simply renders no meta until the persisted id lands.
  const msg = messagesById(messagesQuery.data).get(messageId);
  if (!msg) return null;

  return {
    model: msg.model ?? null,
    characterId: msg.characterId ?? null,
    inputTokens: msg.inputTokens ?? null,
    outputTokens: msg.outputTokens ?? null,
    cost: msg.cost ?? null,
  };
}

// Only a GROUP turn stores a speaker: the rotation sets speakingCharacterId per
// reply, while a single-character chat leaves it null, so the one bound
// character is the speaker by definition. The binding comes from the
// conversation rather than the loadout atom, which holds the cookie-persisted
// new-chat defaults and says nothing about the chat being read.
export function useSpeakingCharacter() {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const meta = useMessageMeta();
  const bindingsQuery = useChatBindingsQuery(remoteId ?? undefined);
  const charactersQuery = useCharactersQuery();

  // Without a recorded speaker the reply came from the primary character, the
  // first active binding, same as the prompt assembler picks.
  const primary = (bindingsQuery.data?.characters ?? [])
    .filter((b) => b.isActive !== false)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))[0];
  const charId = meta?.characterId ?? primary?.characterId;
  if (!charId) return null;
  return charactersQuery.data?.find((c) => c.id === charId) ?? null;
}

// Same precedence the settings drawer displays: the conversation row, then its
// preset, then the sticky defaults. The drawer stores null when the form equals
// the preset, so a resolver that skips the preset shows off and runs on.
export function useStreamFlag(
  key: "showReasoning" | "autoScrollStream",
): boolean {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const loadout = useAtomValue(chatLoadoutAtom);
  const defaults = useAtomValue(chatDefaultsAtom);
  const settingsQuery = useChatSettingsQuery(remoteId ?? undefined);
  const presetsQuery = usePresetsQuery();

  const settings = settingsQuery.data;
  if (settings?.[key] != null) return settings[key];

  const presetId = settings?.presetId ?? loadout.presetId;
  const preset = presetId
    ? presetsQuery.data?.find((p) => p.id === presetId)
    : undefined;
  if (preset?.[key] != null) return preset[key];

  return defaults[key] ?? true;
}

// A lorebook used as a character card carries the face: in a chat with no
// character, the first bound lorebook that has an avatar stands in.
export function useLorebookSpeaker(): {
  name: string;
  avatarMediaId: string | null;
} | null {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const bindingsQuery = useChatBindingsQuery(remoteId ?? undefined);
  const lorebooksQuery = useLorebooksQuery();
  if ((bindingsQuery.data?.characters.length ?? 0) > 0) return null;
  const bound = [...(bindingsQuery.data?.lorebooks ?? [])].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );
  for (const b of bound) {
    const book = lorebooksQuery.data?.find((l) => l.id === b.lorebookId);
    if (book?.avatarMediaId)
      return { name: book.name, avatarMediaId: book.avatarMediaId };
  }
  return null;
}
