import {
  deleteLocalConversation,
  readLocalConversation,
  readLocalConversations,
  updateLocalConversationSettings,
} from "@/lib/db/client/data/chat/chat";
import { isCustomModelId } from "@/lib/ai/chat/custom-provider-id";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { chatModelAtom, chatStore, freshConvId } from "@/store/chat-store";
import { seedConversation } from "./conversation-seed";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import type { QueryClient } from "@tanstack/react-query";
import { createAssistantStream } from "assistant-stream";
import { dayjs } from "@/lib/utils/format/date";
import type { useTranslations } from "next-intl";
import { extractFirstUserText } from "./chat-utils";

export function createThreadListAdapter(
  queryClient: QueryClient,
  t: ReturnType<typeof useTranslations<never>>,
): RemoteThreadListAdapter {
  const persistTitle = async (id: string, title: string) => {
    const now = dayjs().toDate();
    const existing = await readLocalConversation(id);
    if (!existing) return;
    await updateLocalConversationSettings({
      convId: id,
      title,
      updatedAt: now,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
  };
  return {
    async list() {
      const items = (await readLocalConversations()) ?? [];
      return {
        threads: items.map((item) => ({
          remoteId: item.id,
          status: "regular",
          title: item.title ?? undefined,
        })),
      };
    },

    async initialize(localThreadId) {
      // Keyed by the local thread, so this returns the id the send wrapper already
      // minted for THIS chat, or mints one when initialize runs first (attachment
      // before any send). Never the atom's, which the route keeps pointed at the
      // previous conversation. seedConversation is idempotent per convId.
      const id = freshConvId(localThreadId);
      await seedConversation({
        convId: id,
        queryClient,
        noModelsError: t("ERRORS.NO_TEXT_MODELS"),
      });
      return { remoteId: id, externalId: undefined };
    },

    async rename(id, title) {
      await persistTitle(id, title);
    },

    async archive(_id) {},
    async unarchive(_id) {},

    async delete(id) {
      await deleteLocalConversation(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    },

    async fetch(id) {
      const local = await readLocalConversation(id);
      if (local) {
        return {
          remoteId: local.id,
          status: "regular",
          title: local.title ?? undefined,
        };
      }

      handleError(new Error("chat-not-found"), t, "chat-not-found");
      return {
        remoteId: id,
        status: "regular",
        title: undefined,
      };
    },

    async generateTitle(id, messages) {
      return createAssistantStream(async (controller) => {
        const text = extractFirstUserText(messages);
        if (!text) {
          controller.appendText(t("CHAT.NEW_CONVERSATION"));
          return;
        }

        const selected = chatStore.get(chatModelAtom);
        const model =
          selected && !isCustomModelId(selected) ? selected : undefined;
        // Title gen is best-effort: an unauthorized/expired session or a flaky
        // free-model race must not surface as an unhandled error. Fall back to a
        // trimmed first-message title so the thread still gets a name.
        let title: string;
        try {
          const res = await rpc.api.ai.chat.title.post({ text, model });
          title = handleElysia(res).title;
        } catch {
          title = text.slice(0, 60).trim() || t("CHAT.NEW_CONVERSATION");
        }
        controller.appendText(title);

        await persistTitle(id, title);
      });
    },
  };
}
