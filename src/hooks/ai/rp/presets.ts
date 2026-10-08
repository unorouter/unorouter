"use client";

import {
  deleteLocalPreset,
  readLocalPreset,
  readLocalPresets,
  upsertLocalPreset,
} from "@/lib/db/client/data/rp/rp";
import { msg } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { useApiMutation } from "@/lib/react-query/hooks";
import { uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { makeRpEntity } from "./factory";
import type { PresetRow } from "@/lib/db/schema/rows";

const presets = makeRpEntity<
  PresetRow,
  Record<string, unknown>,
  Record<string, unknown>
>({
  listKey: queryKeys.presets,
  itemKey: queryKeys.preset,
  readList: readLocalPresets,
  readItem: readLocalPreset,
  upsertLocal: upsertLocalPreset,
  deleteLocal: deleteLocalPreset,
});

export const usePresetsQuery = presets.useList;
export const useCreatePresetMutation = presets.useCreate;
export const useUpdatePresetMutation = presets.useUpdate;
export const useDeletePresetMutation = presets.useDelete;
export const useDuplicatePresetMutation = presets.useDuplicate;

export function useImportPresetMutation() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      // RisuAI scrambles this one on the way out and only its own build can
      // unscramble it, so the JSON export beside it is the way in.
      if (file.name.toLowerCase().endsWith(".risup")) {
        throw new Error(msg("ERRORS.PRESET_RISUP"));
      }
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        throw new Error(msg("ERRORS.PRESET_NOT_JSON"));
      }
      // SillyTavern and Risu name the preset by its filename, never inside it.
      const fallbackName = file.name.replace(/\.[^.]+$/, "").trim();
      const parsed = (
        await import("@/lib/ai/rp/preset-import")
      ).parsePresetJson(raw, fallbackName || "Imported preset");
      if (!parsed) throw new Error(msg("ERRORS.PRESET_UNRECOGNIZED"));
      const now = dayjs().toDate();
      await upsertLocalPreset({
        ...parsed,
        id: uid(),
        createdAt: now,
        updatedAt: now,
      });
      return { name: parsed.name };
    },
    invalidates: [queryKeys.presets()],
  });
}

