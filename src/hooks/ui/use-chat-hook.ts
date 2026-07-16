"use client";

import { useMessagesInfiniteQuery } from "@/hooks/ai/chat-hook";
import { useChatSettingsQuery } from "@/hooks/ai/rp/conversations";
import { usePresetsQuery } from "@/hooks/ai/rp/presets";
import type { ApiMessage } from "@/lib/ai/chat/messages";
import { chatLoadoutAtom } from "@/store/chat-store";
import { useAuiState } from "@assistant-ui/react";
import { useAtomValue } from "jotai";

type MessageMeta = {
  model: string | null;
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
    inputTokens: msg.inputTokens ?? null,
    outputTokens: msg.outputTokens ?? null,
    cost: msg.cost ?? null,
  };
}

export function useShowReasoning(): boolean {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const loadout = useAtomValue(chatLoadoutAtom);
  const settingsQuery = useChatSettingsQuery(remoteId ?? undefined);
  const presetsQuery = usePresetsQuery();

  const settings = settingsQuery.data;
  if (settings?.showReasoning != null) return settings.showReasoning;

  const presetId = settings?.presetId ?? loadout.presetId;
  const preset = presetId
    ? presetsQuery.data?.find((p) => p.id === presetId)
    : undefined;
  if (preset?.showReasoning != null) return preset.showReasoning;

  return true;
}
