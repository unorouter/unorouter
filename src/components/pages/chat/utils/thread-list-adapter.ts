import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";

export function createThreadListAdapter(): RemoteThreadListAdapter {
  return {
    async list() {
      const data = handleElysia(
        await rpc.api.chat.get({ query: { p: 1, page_size: 100 } }),
      );
      return {
        threads: data.items.map((item) => ({
          remoteId: item.id,
          status: "regular" as const,
          title: item.title ?? undefined,
        })),
      };
    },

    async initialize(threadId) {
      const data = handleElysia(
        await rpc.api.chat.post({ model: "claude-haiku-4-5-20251001" }),
      );
      return { remoteId: data.id, externalId: undefined };
    },

    async rename(remoteId, newTitle) {
      handleElysia(
        await rpc.api.chat({ id: remoteId }).put({ title: newTitle }),
      );
    },

    async archive(_remoteId) {
      // Not implemented
    },

    async unarchive(_remoteId) {
      // Not implemented
    },

    async delete(remoteId) {
      handleElysia(await rpc.api.chat({ id: remoteId }).delete());
    },

    async fetch(remoteId) {
      const data = handleElysia(
        await rpc.api.chat({ id: remoteId }).meta.get(),
      );
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

        // Persist to server
        handleElysia(await rpc.api.chat({ id }).put({ title }));
      });
    },
  };
}
