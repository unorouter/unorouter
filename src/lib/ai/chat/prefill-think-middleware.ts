import type { LanguageModelMiddleware } from "ai";

const CLOSING_TAG = "</think>";

// Full match index, or the start of a partial tag at the buffer's end (chunk
// boundaries can split "</think>"), else null.
function closingTagIndex(buffer: string): number | null {
  const direct = buffer.indexOf(CLOSING_TAG);
  if (direct !== -1) return direct;
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (CLOSING_TAG.startsWith(buffer.slice(i))) return i;
  }
  return null;
}

type StreamChunk = {
  type: string;
  id?: string;
  delta?: string;
  [key: string]: unknown;
};

// For requests whose trailing assistant prefill left an open <think> tag: the
// model's reply begins INSIDE its reasoning, but how that arrives depends on
// the upstream channel. Channels that parse the chat template return separated
// reasoning parts plus a clean answer; channels that forward the raw
// continuation return "CoT</think>answer" as plain text with no opening tag.
// A static startWithReasoning flag breaks one case or the other (forcing it
// swallows the separated channels' answer into the thinking box), so decide
// per stream: native reasoning first => pass through untouched; text first =>
// treat it as reasoning until the closing tag hands over to the real reply.
export function prefillThinkMiddleware(): LanguageModelMiddleware {
  return {
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      const content = result.content as Array<{ type: string; text?: string }>;
      if (content.some((p) => p.type === "reasoning")) return result;
      const idx = content.findIndex(
        (p) => p.type === "text" && (p.text ?? "").includes(CLOSING_TAG),
      );
      if (idx === -1) return result;
      const part = content[idx];
      const at = (part.text ?? "").indexOf(CLOSING_TAG);
      const out = [...content];
      out.splice(
        idx,
        1,
        { type: "reasoning", text: (part.text ?? "").slice(0, at) },
        { ...part, text: (part.text ?? "").slice(at + CLOSING_TAG.length) },
      );
      return { ...result, content: out as typeof result.content };
    },

    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      const REASONING_ID = "prefill-think";
      let mode: "undecided" | "passthrough" | "reasoning" | "text" =
        "undecided";
      let pendingTextStarts: StreamChunk[] = [];
      let buffer = "";

      const transformed = (stream as ReadableStream<StreamChunk>).pipeThrough(
        new TransformStream<StreamChunk, StreamChunk>({
          transform(chunk, controller) {
            if (mode === "passthrough" || mode === "text") {
              controller.enqueue(chunk);
              return;
            }

            if (mode === "undecided") {
              if (
                chunk.type === "reasoning-start" ||
                chunk.type === "reasoning-delta"
              ) {
                mode = "passthrough";
                for (const c of pendingTextStarts) controller.enqueue(c);
                pendingTextStarts = [];
                controller.enqueue(chunk);
                return;
              }
              if (chunk.type === "text-start") {
                pendingTextStarts.push(chunk);
                return;
              }
              if (chunk.type === "text-delta") {
                mode = "reasoning";
                controller.enqueue({
                  type: "reasoning-start",
                  id: REASONING_ID,
                });
              } else {
                controller.enqueue(chunk);
                return;
              }
            }

            if (chunk.type === "text-delta") {
              buffer += chunk.delta ?? "";
              const idx = closingTagIndex(buffer);
              if (idx === null) {
                if (buffer) {
                  controller.enqueue({
                    type: "reasoning-delta",
                    id: REASONING_ID,
                    delta: buffer,
                  });
                  buffer = "";
                }
                return;
              }
              if (idx > 0) {
                controller.enqueue({
                  type: "reasoning-delta",
                  id: REASONING_ID,
                  delta: buffer.slice(0, idx),
                });
                buffer = buffer.slice(idx);
              }
              if (buffer.length >= CLOSING_TAG.length) {
                controller.enqueue({ type: "reasoning-end", id: REASONING_ID });
                mode = "text";
                for (const c of pendingTextStarts) controller.enqueue(c);
                pendingTextStarts = [];
                const restText = buffer.slice(CLOSING_TAG.length);
                buffer = "";
                if (restText) {
                  controller.enqueue({
                    type: "text-delta",
                    id: chunk.id,
                    delta: restText,
                  });
                }
              }
              return;
            }

            if (chunk.type === "text-end") {
              // Stream ended inside reasoning (thinking cut off): close the
              // reasoning part and drop the never-started text block.
              if (buffer) {
                controller.enqueue({
                  type: "reasoning-delta",
                  id: REASONING_ID,
                  delta: buffer,
                });
                buffer = "";
              }
              controller.enqueue({ type: "reasoning-end", id: REASONING_ID });
              pendingTextStarts = [];
              mode = "text";
              return;
            }

            controller.enqueue(chunk);
          },
        }),
      );

      return { stream: transformed, ...rest } as Awaited<
        ReturnType<typeof doStream>
      >;
    },
  };
}
