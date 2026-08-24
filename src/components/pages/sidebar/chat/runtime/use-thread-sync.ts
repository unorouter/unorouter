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

// One instance per mounted thread, all writing the same atom, and threads overlap
// during a switch. Claiming on mount and releasing ONLY the id this thread claimed
// keeps a late-unmounting predecessor from restoring its own conversation over the
// new one, which sent the next message into the previous chat.
export function useConvIdSync(remoteId: string | null | undefined) {
  useEffect(() => {
    const claimed = remoteId ?? null;
    chatStore.set(convIdAtom, claimed);
    if (claimed === null) return;
    return () => {
      if (chatStore.get(convIdAtom) === claimed)
        chatStore.set(convIdAtom, null);
    };
  }, [remoteId]);
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
  "streamingEnabled",
  "autoScrollStream",
  "showReasoning",
] as const;

export function useSettingsSync(remoteId: string | null | undefined) {
  const setActiveOverrides = useSetAtom(activeConvOverridesAtom);
  const setWebSearch = useSetAtom(chatWebSearchAtom);
  const settingsQuery = useChatSettingsQuery(remoteId ?? undefined);
  const lastSyncedIdRef = useRef<string | undefined>(undefined);

  const settings = settingsQuery.data;
  useEffect(() => {
    if (!remoteId) {
      lastSyncedIdRef.current = undefined;
      setActiveOverrides(null);
      return;
    }
    if (!settings || remoteId === lastSyncedIdRef.current) return;
    lastSyncedIdRef.current = remoteId;
    const overrides: StreamOverrides = {};
    const row = rec(settings) ?? {};
    for (const k of OVERRIDE_KEYS) {
      const v = row[k];
      if (v !== null && v !== undefined) {
        Object.assign(overrides, { [k]: v });
      }
    }
    setActiveOverrides(overrides);
    setWebSearch(Boolean(row.webSearchEnabled));
  }, [remoteId, settings, setActiveOverrides, setWebSearch]);
}
