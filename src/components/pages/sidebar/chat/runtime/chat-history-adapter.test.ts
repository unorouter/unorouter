import { afterEach, describe, expect, test } from "bun:test";
import { bindExternalStoreMessage } from "@assistant-ui/core";
import { QueryClient } from "@tanstack/react-query";
import { aiSDKV6FormatAdapter } from "assistant-cloud/ai-sdk";
import type { ApiMessage } from "@/lib/ai/chat/messages";
import { queryKeys } from "@/lib/react-query/keys";
import { assistantRuntimeAtom, chatStore } from "@/store/chat-store";
import { createChatHistoryAdapter } from "./chat-history-adapter";

const CONV = "conv-1";

const row = (
  id: string,
  parentId: string | null,
  role: string,
  text: string,
  minute: number,
  isActiveBranch = true,
): ApiMessage => ({
  id,
  parentId,
  role,
  isActiveBranch,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, minute)),
  items: [{ id: `${id}-0`, sequenceIndex: 0, type: "text", data: { text } }],
});

function loadWith(stored: ApiMessage[]) {
  const queryClient = new QueryClient();
  queryClient.setQueryData([...queryKeys.chatMessages(CONV)], {
    pages: [{ messages: stored, total: stored.length }],
    pageParams: [1],
  });
  return createChatHistoryAdapter(queryClient, () => CONV)
    .withFormat?.(aiSDKV6FormatAdapter)
    .load();
}

// What the runtime holds mid send: settled turns carry the raw useChat message.
function liveThread(
  turns: { id: string; role: string; text: string; settled: boolean }[],
) {
  const messages = turns.map((t) => {
    const tm = {
      id: t.id,
      role: t.role,
      status: t.settled ? { type: "complete" } : { type: "running" },
    };
    bindExternalStoreMessage(tm, {
      id: t.id,
      role: t.role,
      parts: [{ type: "text", text: t.text }],
    });
    return tm;
  });
  chatStore.set(assistantRuntimeAtom, {
    thread: { getState: () => ({ isRunning: true, messages }) },
  });
}

afterEach(() => chatStore.set(assistantRuntimeAtom, null));

describe("history load", () => {
  test("restores the active branch with its parents", async () => {
    const repo = await loadWith([
      row("greeting", null, "assistant", "hello", 0),
      row("user", "greeting", "user", "hi", 1),
      row("reply-old", "user", "assistant", "old", 2, false),
      row("reply-new", "user", "assistant", "new", 3),
    ]);
    expect(repo?.headId).toBe("reply-new");
    expect(
      repo?.messages.map((m) => [m.message.id, m.parentId, m.message.parts]),
    ).toEqual([
      ["greeting", null, [{ type: "text", text: "hello" }]],
      ["user", "greeting", [{ type: "text", text: "hi" }]],
      ["reply-old", "user", [{ type: "text", text: "old" }]],
      ["reply-new", "user", [{ type: "text", text: "new" }]],
    ]);
  });

  test("a load during the first reply keeps the user's message", async () => {
    liveThread([
      { id: "greeting", role: "assistant", text: "hello", settled: true },
      { id: "user", role: "user", text: "hi", settled: true },
      { id: "reply", role: "assistant", text: "stream", settled: false },
    ]);
    const repo = await loadWith([
      row("greeting", null, "assistant", "hello", 0),
    ]);
    expect(repo?.headId).toBe("user");
    expect(repo?.messages.map((m) => [m.message.id, m.parentId])).toEqual([
      ["greeting", null],
      ["user", "greeting"],
    ]);
  });
});
