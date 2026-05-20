"use client";

import {
  deleteLocalPreset,
  readLocalPreset,
  readLocalPresets,
  upsertLocalPreset,
} from "@/lib/db/client/data/rp";
import { queryKeys } from "@/lib/react-query/keys";
import { makeRpEntity } from "./factory";
import type { PresetRow } from "@/lib/db/schema/rows";

const presets = makeRpEntity<
  PresetRow,
  Record<string, unknown>,
  Record<string, unknown>
>({
  syncKind: "presets",
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
