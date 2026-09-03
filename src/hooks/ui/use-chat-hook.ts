"use client";

import { useMessagesInfiniteQuery } from "@/hooks/ai/chat-hook";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import {
  useChatBindingsQuery,
  useChatSettingsQuery,
} from "@/hooks/ai/rp/conversations";
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

type MessageCache = {
  flat: ApiMessage[];
  byId: Map<string, ApiMessage>;
};

const cache = new WeakMap<object, MessageCache>();

function getMessageCache(pages: object[]): MessageCache {
  let entry = cache.get(pages);
  if (!entry) {
    const flat = [...pages]
      .reverse()
      .flatMap((p) => (p as { messages: ApiMessage[] }).messages);
    entry = {
      flat,
      byId: new Map(
        flat
          .filter((m): m is ApiMessage => !!m.id)
          .map((m) => [m.id, m] as const),
      ),
    };
    cache.set(pages, entry);
  }
  return entry;
}

export function useMessageMeta(): MessageMeta | null {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const messageId = useAuiState((s) => s.message.id);
  const messagesQuery = useMessagesInfiniteQuery(remoteId ?? undefined);

  if (!messagesQuery.data) return null;

  // Id match only: a positional fallback (render index into the flat DB list)
  // showed the WRONG row's model/cost on branched threads. An optimistic id
  // that misses simply renders no meta until the persisted id lands.
  const { byId } = getMessageCache(messagesQuery.data.pages);
  const msg = byId.get(messageId);
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

  const bound = bindingsQuery.data?.characters ?? [];
  const charId =
    meta?.characterId ?? (bound.length === 1 ? bound[0]?.characterId : null);
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
