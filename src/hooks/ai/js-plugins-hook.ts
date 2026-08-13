"use client";

import {
  deleteLocalJsPlugin,
  readLocalJsPlugin,
  readLocalJsPlugins,
  upsertLocalJsPlugin,
} from "@/lib/db/client/data/rp/js-plugins";
import { queryKeys } from "@/lib/react-query/keys";
import { makeRpEntity } from "./rp/factory";
import type { JsPluginRow } from "@/lib/db/schema/rows";
import type { JsPluginBody } from "@/lib/validation/js-plugin";

const jsPlugins = makeRpEntity<
  JsPluginRow,
  JsPluginBody,
  Partial<JsPluginBody>
>({
  listKey: queryKeys.jsPlugins,
  itemKey: queryKeys.jsPlugin,
  readList: readLocalJsPlugins,
  readItem: readLocalJsPlugin,
  upsertLocal: upsertLocalJsPlugin,
  deleteLocal: deleteLocalJsPlugin,
});

export const useJsPluginsQuery = jsPlugins.useList;
export const useJsPluginQuery = jsPlugins.useItem;
export const useCreateJsPluginMutation = jsPlugins.useCreate;
export const useUpdateJsPluginMutation = jsPlugins.useUpdate;
export const useDeleteJsPluginMutation = jsPlugins.useDelete;
