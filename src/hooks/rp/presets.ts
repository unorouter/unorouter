"use client";

import { readLocalPreset, readLocalPresets } from "@/lib/db/client/reads";
import { deleteLocalPreset, upsertLocalPreset } from "@/lib/db/client/writes";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { makeRpEntity } from "./factory";
import type { EntityListResponse } from "./shared";

type PresetsList = EntityListResponse<typeof rpc.api.ai.rp.presets.get>;
export type Preset =
  PresetsList extends ReadonlyArray<infer Item> ? Item : never;

const presets = makeRpEntity<
  Preset,
  Record<string, unknown>,
  Record<string, unknown>
>({
  syncKind: "presets",
  listKey: queryKeys.presets,
  itemKey: queryKeys.preset,
  readList: (userId) => readLocalPresets(userId) as Promise<Preset[] | null>,
  readItem: (userId, id) =>
    readLocalPreset(userId, id) as Promise<Preset | null>,
  upsertLocal: (userId, row) => upsertLocalPreset(userId, row as never),
  deleteLocal: (userId, id) => deleteLocalPreset(userId, id),
});

export const usePresetsQuery = presets.useList;
export const useCreatePresetMutation = presets.useCreate;
export const useUpdatePresetMutation = presets.useUpdate;
export const useDeletePresetMutation = presets.useDelete;
