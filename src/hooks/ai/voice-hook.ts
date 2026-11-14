"use client";

import {
  readLocalVoiceSettings,
  upsertLocalVoiceSettings,
} from "@/lib/db/client/data/voice";
import { queryKeys } from "@/lib/react-query/keys";
import { useApiMutation } from "@/lib/react-query/hooks";
import { rec, recArr } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import type { FishVoice, VoiceSettingsForm } from "@/lib/validation/voice";
import { useQuery } from "@tanstack/react-query";

export function useVoiceSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.voiceSettings(),
    queryFn: async () => (await readLocalVoiceSettings()) ?? null,
  });
}

export function useSaveVoiceSettingsMutation() {
  return useApiMutation({
    mutationFn: async (form: VoiceSettingsForm) => {
      const now = dayjs().toDate();
      await upsertLocalVoiceSettings({
        ...form,
        apiKey: form.apiKey.trim().replace(/^Bearer\s+/i, ""),
        voiceId: form.voiceId || null,
        narratorVoiceId: form.narratorVoiceId || null,
        createdAt: now,
        updatedAt: now,
      });
    },
    invalidates: [queryKeys.voiceSettings()],
    successKey: "CHAT.VOICE.SAVED",
  });
}

const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function useFishVoicesQuery(query: string, apiKey: string) {
  return useQuery({
    queryKey: queryKeys.fishVoices(query),
    enabled: apiKey.trim().length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<FishVoice[]> => {
      const res = await fetch(
        `/api/ai/voice/fish/voices?q=${encodeURIComponent(query)}`,
        { headers: { authorization: `Bearer ${apiKey.trim()}` } },
      );
      if (!res.ok) throw new Error(`Fish Audio ${res.status}`);
      return recArr(rec(await res.json())?.items).flatMap((m) =>
        typeof m._id === "string" && typeof m.title === "string"
          ? [
              {
                id: m._id,
                title: m.title,
                languages: strings(m.languages),
                tags: strings(m.tags),
              },
            ]
          : [],
      );
    },
  });
}
