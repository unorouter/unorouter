"use client";

import { useChatSettingsQuery } from "@/hooks/ai/rp/conversations";
import type { StreamOverrides } from "@/lib/validation/chat";
import {
  activeConvOverridesAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
} from "@/store/chat-store";
import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";

export function useConvIdSync(remoteId: string | null | undefined) {
  useEffect(() => {
    chatStore.set(convIdAtom, remoteId ?? null);
  }, [remoteId]);
}

const OVERRIDE_KEYS = [
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
    const row = settings as Record<string, unknown>;
    for (const k of OVERRIDE_KEYS) {
      const v = row[k];
      if (v !== null && v !== undefined) {
        (overrides as Record<string, unknown>)[k] = v;
      }
    }
    setActiveOverrides(overrides);
    setWebSearch(Boolean(row.webSearchEnabled));
  }, [remoteId, settings, setActiveOverrides, setWebSearch]);
}
