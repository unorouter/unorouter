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
export function useImportPresetFromUrlMutation() {
  return useApiMutation({
    mutationFn: (input: string) =>
      runUrlImport(input, async (result) => {
        if (!("preset" in result)) {
          throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
        }
        const now = dayjs().toDate();
        await upsertLocalPreset({
          id: uid(),
          name: result.preset.name,
          promptTemplate: result.preset.promptTemplate,
          createdAt: now,
          updatedAt: now,
        });
        return { name: result.preset.name };
      }),
    invalidates: [queryKeys.presets()],
  });
}
