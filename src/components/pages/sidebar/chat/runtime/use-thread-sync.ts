"use client";

import { useChatSettingsQuery } from "@/hooks/ai/rp/conversations";
import { rec } from "@/lib/utils/base";
import type { StreamOverrides } from "@/lib/validation/chat";
import {
  activeConvOverridesAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
} from "@/store/chat-store";
import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";

// Threads overlap during a switch: releasing only the id this thread claimed
// stops a late-unmounting predecessor from sending the next message into the
// previous chat. The prewarmed draft must not claim while hidden.
export function useConvIdSync(
  remoteId: string | null | undefined,
  isMain: boolean,
) {
  useEffect(() => {
    if (!isMain) return;
    const claimed = remoteId ?? null;
    chatStore.set(convIdAtom, claimed);
    if (claimed === null) return;
    return () => {
      if (chatStore.get(convIdAtom) === claimed)
        chatStore.set(convIdAtom, null);
    };
  }, [remoteId, isMain]);
}

const OVERRIDE_KEYS: readonly (keyof StreamOverrides)[] = [
  "reasoningEffort",
  "temperature",
  "topP",
  "topK",
  "minP",
  "topA",
  "frequencyPenalty",
  "presencePenalty",
  "repetitionPenalty",
  "maxTokens",
  "extraBody",
  "systemPromptOverride",
  "authorNote",
  "authorNoteDepth",
  "chatMemory",
  "contextTokens",
  "streamingEnabled",
  "autoScrollStream",
  "showReasoning",
] as const;

export function useSettingsSync(
  remoteId: string | null | undefined,
  isMain: boolean,
) {
  const setActiveOverrides = useSetAtom(activeConvOverridesAtom);
  const setWebSearch = useSetAtom(chatWebSearchAtom);
  const settingsQuery = useChatSettingsQuery(remoteId ?? undefined);
  const lastSyncedIdRef = useRef<string | undefined>(undefined);

  const settings = settingsQuery.data;
  useEffect(() => {
    if (!isMain) return;
    if (!remoteId) {
      lastSyncedIdRef.current = undefined;
      setActiveOverrides(null);
      return;
    }
    if (!settings) return;
    const overrides: StreamOverrides = {};
    const row = rec(settings) ?? {};
    for (const k of OVERRIDE_KEYS) {
      const v = row[k];
      if (v !== null && v !== undefined) {
        Object.assign(overrides, { [k]: v });
      }
    }
    // Overrides follow every save; web search only seeds once, since the composer
    // toggle lives in the atom alone and a refetch would undo it.
    setActiveOverrides(overrides);
    if (remoteId === lastSyncedIdRef.current) return;
    lastSyncedIdRef.current = remoteId;
    setWebSearch(Boolean(row.webSearchEnabled));
  }, [isMain, remoteId, settings, setActiveOverrides, setWebSearch]);
}
