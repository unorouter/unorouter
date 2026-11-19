import { describe, expect, test } from "bun:test";
import {
  itemsToParts,
  partsToItems,
  walkActiveBranch,
  type ApiMessage,
  type MessagePart,
} from "./messages";

const node = (id: string, parentId: string | null, isActiveBranch = true) => ({
  id,
  parentId,
  isActiveBranch,
});

const ids = (msgs: { id: string }[]) => msgs.map((m) => m.id);

describe("walkActiveBranch", () => {
  test("follows the active sibling at each fork", () => {
    const { path, tipId } = walkActiveBranch([
      node("greeting", null),
      node("user", "greeting"),
      node("reply-old", "user", false),
      node("reply-new", "user"),
    ]);
    expect(ids(path)).toEqual(["greeting", "user", "reply-new"]);
    expect(tipId).toBe("reply-new");
  });

  test("a missing parent falls back to the row before it", () => {
    const { path } = walkActiveBranch([
      node("greeting", null),
      node("user", "deleted"),
      node("reply", "user"),
    ]);
    expect(ids(path)).toEqual(["greeting", "user", "reply"]);
  });

  test("every sibling deactivated still reaches the continued branch", () => {
    const { path } = walkActiveBranch([
      node("greeting", null),
      node("a", "greeting", false),
      node("b", "greeting", false),
      node("a-reply", "a", false),
    ]);
    expect(ids(path)).toEqual(["greeting", "a", "a-reply"]);
  });
});

const stored = (parts: MessagePart[]): ApiMessage["items"] =>
  partsToItems(parts).map((it, i) => ({
    id: `item-${i}`,
    sequenceIndex: i,
    type: it.type,
    data: it.data,
  }));

describe("parts persistence", () => {
  test("text, reasoning and files survive a reload", () => {
    const parts: MessagePart[] = [
      { type: "reasoning", text: "thinking" },
      { type: "text", text: "answer" },
      {
        type: "file",
        url: "blob:x",
        mediaType: "image/png",
        filename: "a.png",
      },
    ];
    expect(itemsToParts(stored(parts))).toEqual(parts);
  });

  test("split reasoning reloads as one part", () => {
    const parts = itemsToParts(
      stored([
        { type: "reasoning", text: "first" },
        { type: "reasoning", text: "second" },
        { type: "text", text: "answer" },
      ]),
    );
    expect(parts).toEqual([
      { type: "reasoning", text: "first\n\nsecond" },
      { type: "text", text: "answer" },
    ]);
  });

  test("dynamic tool calls round-trip and open a new step", () => {
    const parts: MessagePart[] = [
      {
        type: "tool-search",
        toolCallId: "t1",
        state: "input-available",
        input: { q: "x" },
      },
      {
        type: "dynamic-tool",
        toolName: "fetch_page",
        toolCallId: "t2",
        state: "output-available",
        input: { url: "https://a.b" },
        output: { ok: true },
      },
      {
        type: "dynamic-tool",
        toolName: "fetch_page",
        toolCallId: "t3",
        state: "input-available",
        input: { url: "https://c.d" },
      },
      { type: "text", text: "done" },
    ];
    expect(itemsToParts(stored(parts))).toEqual([
      {
        type: "dynamic-tool",
        toolName: "fetch_page",
        toolCallId: "t2",
        state: "output-available",
        input: { url: "https://a.b" },
        output: { ok: true },
      },
      {
        type: "dynamic-tool",
        toolName: "fetch_page",
        toolCallId: "t3",
        state: "output-error",
        input: { url: "https://c.d" },
        errorText: "interrupted",
      },
      { type: "step-start" },
      { type: "text", text: "done" },
    ]);
  });

  test("an error part survives a reload", () => {
    const parts: MessagePart[] = [
      { type: "data-error", data: { message: "upstream 500", model: "m" } },
    ];
    expect(itemsToParts(stored(parts))).toEqual(parts);
  });
});
