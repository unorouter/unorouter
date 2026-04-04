import { PAGE_SIZE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenResponse } from "@/lib/types/eden";
import { handleElysia, uid } from "@/lib/utils/base";
import { getChatModel, getConvId, setConvId } from "@/store/chat-store";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { createAssistantStream } from "assistant-stream";

type ConversationsData = EdenResponse<{ get: typeof rpc.api.chat.get }, "get">;

export function createThreadListAdapter(
  queryClient: QueryClient,
): RemoteThreadListAdapter {
  return {
    async list() {
      // Use SSR-prefetched data or fetch into cache so useConversationsInfiniteQuery gets a hit
      const data =
        queryClient.getQueryData<InfiniteData<ConversationsData>>(
          queryKeys.conversations(),
        ) ??
        (await queryClient.fetchInfiniteQuery({
          queryKey: queryKeys.conversations(),
          queryFn: async ({ pageParam }) =>
            handleElysia(
              await rpc.api.chat.get({
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
      queryClient.setQueryData<InfiniteData<ConversationsData>>(
        queryKeys.conversations(),
        (old) => {
          if (!old?.pages[0]) return old;
          const newItem = {
            ...data,
            shareId: null,
            totalCost: 0,
            createdAt: now,
            updatedAt: now,
          };
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                total: firstPage.total + 1,
                items: [newItem, ...firstPage.items],
              },
              ...old.pages.slice(1),
            ],
          };
        },
      );
      return { remoteId: data.id, externalId: undefined };
    },

    async rename(id, title) {
      await rpc.api.chat({ id }).put({ title });
    },

    async archive(_id) {
      // Not implemented
    },

    async unarchive(_id) {
      // Not implemented
    },

    async delete(id) {
      await rpc.api.chat({ id }).delete();
      queryClient.setQueryData<InfiniteData<ConversationsData>>(
        queryKeys.conversations(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              total: page.total - 1,
              items: page.items.filter((item) => item.id !== id),
            })),
          };
        },
      );
    },

    async fetch(id) {
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
    },

    async generateTitle(id, messages) {
      return createAssistantStream(async (controller) => {
        const firstUserMsg = messages.find((m) => m.role === "user");
        if (!firstUserMsg) {
          controller.appendText("New Chat");
          return;
        }
        const text = firstUserMsg.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join(" ");
        const title =
          text.length > 50 ? text.slice(0, 50).trimEnd() + "..." : text;
        controller.appendText(title);

        // Persist to server and update sidebar cache
        await rpc.api.chat({ id }).put({ title });
        queryClient.setQueryData<InfiniteData<ConversationsData>>(
          queryKeys.conversations(),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === id ? { ...item, title } : item,
                ),
              })),
            };
          },
        );
      });
    },
  };
}
