"use client";

import {
  deleteLocalJsPlugin,
  readLocalJsPlugin,
  readLocalJsPlugins,
  upsertLocalJsPlugin,
} from "@/lib/db/client/data/rp/js-plugins";
import { upsertLocalLorebookBundle } from "@/lib/db/client/data/rp/rp";
import { detectPluginKind } from "@/lib/ai/chat/plugins/engine";
import { msg } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { useApiMutation } from "@/lib/react-query/hooks";
import { uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { makeRpEntity } from "./rp/factory";
import { runUrlImport } from "./rp/use-url-import";
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

// A link can hold a script (a JanitorAI advanced lorebook) or entries (a
// LoreBary plugin, which is a lorebook there and here). Both are pasted from the
// same box, so this writes whichever came back and reports which list it went
// to, rather than failing a link the user reasonably expected to work.
export function useImportJsPluginFromUrlMutation() {
  return useApiMutation({
    mutationFn: (input: string) =>
      runUrlImport(input, async (result) => {
        const now = dayjs().toDate();
        if ("plugin" in result) {
          await upsertLocalJsPlugin({
            id: uid(),
            name: result.plugin.name,
            script: result.plugin.script,
            kind: detectPluginKind(result.plugin.script),
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
          return { importedAsLorebook: null };
        }
        const books = "lorebooks" in result ? result.lorebooks : [];
        if (books.length === 0) {
          throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
        }
        for (const book of books) {
          const id = uid();
          await upsertLocalLorebookBundle({
            lorebook: {
              id,
              name: book.name,
              description: null,
              scanDepth: book.scanDepth ?? 4,
              tokenBudget: 1500,
              recursiveScanning: false,
              createdAt: now,
              updatedAt: now,
            },
            entries: book.entries.map((e, i) => ({
              id: uid(),
              lorebookId: id,
              keys: e.keys,
              secondaryKeys: e.secondaryKeys ?? null,
              content: e.content,
              comment: e.comment ?? null,
              enabled: e.enabled,
              constant: e.constant,
              selective: e.selective,
              priority: e.priority,
              orderIndex: e.orderIndex ?? i,
              matchWholeWords: e.matchWholeWords,
              injectionRole: e.injectionRole ?? "system",
              chance: e.chance ?? null,
              createdAt: now,
              updatedAt: now,
            })),
          });
        }
        return { importedAsLorebook: books[0].name };
      }),
    invalidates: [queryKeys.jsPlugins(), queryKeys.lorebooks()],
  });
}
