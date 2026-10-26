import { describe, expect, test } from "bun:test";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { readUIMessageStream, streamText, wrapLanguageModel } from "ai";
import { chatReasoningMiddleware } from "./coalesce-reasoning-middleware";

type Delta = Record<string, unknown>;

function sseOf(deltas: Delta[]) {
  const frames = deltas.map((delta, i) => ({
    id: "c",
    object: "chat.completion.chunk",
    created: 1,
    model: "m",
    choices: [
      {
        index: 0,
        delta,
        finish_reason: i === deltas.length - 1 ? "stop" : null,
      },
    ],
  }));
  return (
    frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join("") +
    "data: [DONE]\n\n"
  );
}

async function run(deltas: Delta[], prefill = false) {
  const requests: Record<string, unknown>[] = [];
  const sdk = createOpenAICompatible({
    name: "test",
    baseURL: "http://upstream.test/v1",
    fetch: async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(sseOf(deltas), {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });
  const result = streamText({
    model: wrapLanguageModel({
      model: sdk.chatModel("m"),
      middleware: chatReasoningMiddleware(prefill),
    }),
    messages: [
      { role: "system", content: "kept as written" },
      { role: "user", content: "hi" },
    ],
    allowSystemInMessages: true,
  });
  const errors: string[] = [];
  let parts: { type: string; text?: string }[] = [];
  for await (const message of readUIMessageStream({
    stream: result.toUIMessageStream({
      sendReasoning: true,
      onError: (e) => {
        errors.push(String(e));
        return String(e);
      },
    }),
    onError: (e) => errors.push(String(e)),
  }))
    parts = message.parts;
  return {
    errors,
    requests,
    parts: parts
      .filter((p) => p.type === "reasoning" || p.type === "text")
      .map((p) => [p.type, p.text ?? ""]),
  };
}

const THOUGHT_THEN_ANSWER = [
  ["reasoning", "abcdef"],
  ["text", "hi"],
];

describe("chat reasoning stream", () => {
  test("native reasoning_content", async () => {
    const r = await run([
      { reasoning_content: "abc" },
      { reasoning_content: "def" },
      { content: "hi" },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.parts).toEqual(THOUGHT_THEN_ANSWER);
  });

  test("think tags inside content", async () => {
    const r = await run([
      { content: "<think>" },
      { content: "abc" },
      { content: "def</think>" },
      { content: "hi" },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.parts).toEqual(THOUGHT_THEN_ANSWER);
  });

  test("blank content deltas do not split a thought", async () => {
    const r = await run([
      { reasoning_content: "abc", content: "" },
      { content: "\n" },
      { reasoning_content: "def", content: " " },
      { content: "hi" },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.parts).toEqual(THOUGHT_THEN_ANSWER);
  });

  test("empty tool_calls on every delta do not split a thought", async () => {
    const r = await run([
      { reasoning_content: "abc", tool_calls: [] },
      { reasoning_content: "def", tool_calls: [] },
      { content: "hi", tool_calls: [] },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.parts).toEqual(THOUGHT_THEN_ANSWER);
  });

  test("the same thought on both channels shows once", async () => {
    const r = await run([
      { content: "<think>" },
      { reasoning_content: "abc", content: "abc" },
      { reasoning_content: "def", content: "def" },
      { content: "</think>" },
      { content: "hi" },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.parts).toEqual(THOUGHT_THEN_ANSWER);
  });

  test("prefilled think tag closes in content", async () => {
    const r = await run(
      [{ content: "abc" }, { content: "def</think>hi" }],
      true,
    );
    expect(r.errors).toEqual([]);
    expect(r.parts).toEqual(THOUGHT_THEN_ANSWER);
  });

  test("a system message inside the history reaches the upstream", async () => {
    const r = await run([{ content: "hi" }]);
    expect(r.errors).toEqual([]);
    expect(r.requests[0]?.messages).toEqual([
      { role: "system", content: "kept as written" },
      { role: "user", content: "hi" },
    ]);
  });
});
