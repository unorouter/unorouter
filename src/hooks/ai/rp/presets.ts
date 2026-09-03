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
import { runUrlImport } from "./use-url-import";
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

// LoreBary publishes prompts and scenarios, and the fetcher turns both into a
// preset carrying a finished prompt template, so this only writes the row.
export function useImportPresetMutation() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        throw new Error("ERRORS.REQUEST_FAILED");
      }
      const parsed = (
        await import("@/lib/ai/rp/preset-import")
      ).parsePresetJson(raw);
      if (!parsed) throw new Error("ERRORS.REQUEST_FAILED");
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

export function useImportPresetFromUrlMutation() {
  return useApiMutation({
    mutationFn: (input: string) =>
      runUrlImport(input, async (results) => {
        // Keep every preset the URL carried; a lorebary scenario returns one
        // alongside its lorebooks, and a document could carry several.
        const presets = results.flatMap((r) =>
          "preset" in r ? [r.preset] : [],
        );
        if (presets.length === 0) {
          throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
        }
        const now = dayjs().toDate();
        for (const preset of presets) {
          await upsertLocalPreset({
            id: uid(),
            name: preset.name,
            promptTemplate: preset.promptTemplate,
            createdAt: now,
            updatedAt: now,
          });
        }
        return { name: presets[0].name };
      }),
    invalidates: [queryKeys.presets()],
  });
}
