"use client";

import { voiceSettings } from "@/lib/db/schema/client";
import { makeTableStore } from "@/lib/db/client/data/table-store";
import type { LocalRowInput } from "@/lib/types";

const VOICE_SETTINGS_ID = "default";
const voiceStore = makeTableStore(voiceSettings, voiceSettings.id);

export const readLocalVoiceSettings = () => voiceStore.get(VOICE_SETTINGS_ID);
export const upsertLocalVoiceSettings = (row: LocalRowInput) =>
  voiceStore.upsert({ ...row, id: VOICE_SETTINGS_ID });
