import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { newChatModelAtom } from "@/store/client-store";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { getDefaultStore } from "jotai";

export function createThreadListAdapter(): RemoteThreadListAdapter {
  return {
    async list() {
      const data = handleElysia(
        await rpc.api.chat.get({ query: { p: 1, page_size: 100 } }),
      );
      return {
        threads: data.items.map((item) => ({
          remoteId: item.id,
          status: "regular",
          title: item.title ?? undefined,
        })),
      };
    },

    async initialize(_id) {
      const model = getDefaultStore().get(newChatModelAtom)!;
      const data = handleElysia(await rpc.api.chat.post({ model }));
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
    },

    async fetch(id) {
      const data = handleElysia(await rpc.api.chat({ id }).meta.get());
      return {
        remoteId: data.id,
        status: "regular",
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

        // Persist to server
        await rpc.api.chat({ id }).put({ title });
      });
    },
  };
}
