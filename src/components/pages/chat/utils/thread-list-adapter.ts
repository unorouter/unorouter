import { PAGE_SIZE } from "@/lib/config/constants";
import {
  patchConv,
  prependConv,
  removeConv,
  type ConvItem,
  type ConvsInfinite,
} from "@/lib/react-query/conv-cache";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia, uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  addGuestConvId,
  getChatModel,
  getConvId,
  removeGuestConvId,
  setConvId,
} from "@/store/chat-store";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import type { QueryClient } from "@tanstack/react-query";
import type { useTranslations } from "next-intl";
import { createAssistantStream } from "assistant-stream";
import { extractFirstUserText } from "./chat-utils";

export function createThreadListAdapter(
  queryClient: QueryClient,
  t: ReturnType<typeof useTranslations<never>>,
  isLoggedIn: boolean,
): RemoteThreadListAdapter {
  return {
    async list() {
      const data =
        queryClient.getQueryData<ConvsInfinite>(queryKeys.conversations()) ??
        (await queryClient.fetchInfiniteQuery({
          queryKey: queryKeys.conversations(),
          queryFn: async ({ pageParam }) =>
            handleElysia(
              await rpc.api.chat.conversations.get({
                query: { p: pageParam, page_size: PAGE_SIZE },
              }),
            ),
          initialPageParam: 1,
        }));
      const items = data.pages.flatMap((p) => p.items);

      return {
        threads: items.map((item) => ({
          remoteId: item.id,
          status: "regular" as const,
          title: item.title ?? undefined,
        })),
      };
    },

    async initialize(_id) {
      const model = getChatModel()!;
      let id = getConvId();
      if (!id) {
        id = uid();
        setConvId(id);
      }
      const data = handleElysia(await rpc.api.chat.post({ id, model }));
      const now = new Date();
      const newItem: ConvItem = {
        ...data,
        shareId: null,
        totalCost: 0,
        createdAt: now,
        updatedAt: now,
      };

      if (!isLoggedIn) addGuestConvId(data.id);

      queryClient.setQueryData<ConvsInfinite>(
        queryKeys.conversations(),
        (old) => prependConv(old, newItem),
      );
      return { remoteId: data.id, externalId: undefined };
    },

    async rename(id, title) {
      await rpc.api.chat({ id }).put({ title });
    },

    async archive(_id) {},
    async unarchive(_id) {},

    async delete(id) {
      await rpc.api.chat({ id }).delete();
      queryClient.setQueryData<ConvsInfinite>(
        queryKeys.conversations(),
        (old) => removeConv(old, id),
      );
      if (!isLoggedIn) removeGuestConvId(id);
    },

    async fetch(id) {
      const cached = queryClient
        .getQueryData<ConvsInfinite>(queryKeys.conversations())
        ?.pages.flatMap((p) => p.items)
        .find((i) => i.id === id);

      if (cached) {
        return {
          remoteId: cached.id,
          status: "regular" as const,
          title: cached.title ?? undefined,
        };
      }

      try {
        const data = await queryClient.fetchQuery({
          queryKey: queryKeys.chatMeta(id),
          queryFn: async () =>
            handleElysia(await rpc.api.chat({ id }).meta.get()),
        });
        return {
          remoteId: data.id,
          status: "regular" as const,
          title: data.title ?? undefined,
        };
      } catch (e) {
        handleError(e, t, "chat-not-found");
        return {
          remoteId: id,
          status: "regular" as const,
          title: undefined,
        };
      }
    },

    async generateTitle(id, messages) {
      return createAssistantStream(async (controller) => {
        const text = extractFirstUserText(messages);
        if (!text) {
          controller.appendText(t("CHAT.NEW_CONVERSATION"));
          return;
        }

        const res = await rpc.api.chat({ id }).title.post({ text });
        const data = handleElysia(res);
        controller.appendText(data.title);
        queryClient.setQueryData<ConvsInfinite>(
          queryKeys.conversations(),
          (old) => patchConv(old, id, { title: data.title }),
        );
      });
    },
  };
}
