import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenResponse } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { chatModelAtom } from "@/store/chat-store";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { createAssistantStream } from "assistant-stream";
import { getDefaultStore } from "jotai";

type ConversationsData = EdenResponse<{ get: typeof rpc.api.chat.get }, "get">;
type ConversationMeta = EdenResponse<ReturnType<typeof rpc.api.chat>, "get">;

export function createThreadListAdapter(
  queryClient: QueryClient,
): RemoteThreadListAdapter {
  return {
    async list() {
      // Use SSR-prefetched data from React Query cache when available
      const cached = queryClient.getQueryData<InfiniteData<ConversationsData>>(
        queryKeys.conversations(),
      );
      const items = cached
        ? cached.pages.flatMap((p) => p.items)
        : handleElysia(
            await rpc.api.chat.get({ query: { p: 1, page_size: 100 } }),
          ).items;

      return {
        threads: items.map((item) => ({
          remoteId: item.id,
          status: "regular" as const,
          title: item.title ?? undefined,
        })),
      };
    },

    async initialize(_id) {
      const model =
        getDefaultStore().get(chatModelAtom) ?? "claude-haiku-4-5-20251001";
      const data = handleElysia(await rpc.api.chat.post({ model }));
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
      handleElysia(await rpc.api.chat({ id }).put({ title }));
    },

    async archive(_id) {
      // Not implemented
    },

    async unarchive(_id) {
      // Not implemented
    },

    async delete(id) {
      handleElysia(await rpc.api.chat({ id }).delete());
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
      const cached = queryClient.getQueryData<ConversationMeta>(
        queryKeys.conversation(id),
      );
      const data =
        cached ?? handleElysia(await rpc.api.chat({ id }).meta.get());
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
