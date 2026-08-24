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

// The SDK exports no name for its stream-part union, so derive it from the
// middleware type: a hand-written stand-in silently drifts from the real union
// and then needs a cast at every boundary to paper the difference over.
type StreamChunk =
  Awaited<
    ReturnType<
      Parameters<
        NonNullable<LanguageModelMiddleware["wrapStream"]>
      >[0]["doStream"]
    >
  >["stream"] extends ReadableStream<infer P>
    ? P
    : never;

// For requests whose trailing assistant prefill left an open <think> tag: the
// model's reply begins INSIDE its reasoning, but what arrives depends on the
// upstream channel and model. Observed shapes:
//   1. Channel parses the template: native reasoning parts + clean answer text.
//   2. Channel forwards the raw continuation: "CoT</think>answer" as plain text
//      with no opening tag.
//   3. Model ignores the trick (non-GLM-style models): plain answer text, no
//      tags, no native reasoning.
// A static startWithReasoning flag breaks 1 and 3 (swallows the answer into
// the thinking box), so decide per stream: native reasoning first => pass
// through; text first => route it to reasoning until the closing tag. If the
// stream finishes cleanly without ever closing, it was shape 3 - re-emit the
// accumulated text as the reply (a length-cut finish stays reasoning: that is
// truncated thinking, not an answer).
export function prefillThinkMiddleware(): LanguageModelMiddleware {
  return {
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      const content = result.content;
      if (content.some((p) => p.type === "reasoning")) return result;
      const idx = content.findIndex(
        (p) => p.type === "text" && p.text.includes(CLOSING_TAG),
      );
      if (idx === -1) return result;
      const part = content[idx];
      if (part.type !== "text") return result;
      const at = part.text.indexOf(CLOSING_TAG);
      const out = [...content];
      out.splice(
        idx,
        1,
        { type: "reasoning", text: part.text.slice(0, at) },
        { ...part, text: part.text.slice(at + CLOSING_TAG.length) },
      );
      return { ...result, content: out };
    },

    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      const REASONING_ID = "prefill-think";
      let mode: "undecided" | "passthrough" | "reasoning" | "text" =
        "undecided";
      let pendingTextStarts: StreamChunk[] = [];
      let buffer = "";
      let forcedAccum = "";
      let reasoningClosed = false;

      const transformed = stream.pipeThrough(
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
                  forcedAccum += buffer;
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
                forcedAccum += buffer.slice(0, idx);
                controller.enqueue({
                  type: "reasoning-delta",
                  id: REASONING_ID,
                  delta: buffer.slice(0, idx),
                });
                buffer = buffer.slice(idx);
              }
              if (buffer.length >= CLOSING_TAG.length) {
                controller.enqueue({ type: "reasoning-end", id: REASONING_ID });
                reasoningClosed = true;
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
              // Stream may still tell us how it finished; defer the verdict on
              // the never-closed reasoning block to the finish chunk.
              if (buffer) {
                forcedAccum += buffer;
                controller.enqueue({
                  type: "reasoning-delta",
                  id: REASONING_ID,
                  delta: buffer,
                });
                buffer = "";
              }
              return;
            }

            if (chunk.type === "finish") {
              if (!reasoningClosed) {
                controller.enqueue({ type: "reasoning-end", id: REASONING_ID });
                reasoningClosed = true;
                if (
                  chunk.finishReason.unified !== "length" &&
                  forcedAccum.trim()
                ) {
                  const firstStart = pendingTextStarts[0];
                  const startId =
                    firstStart && "id" in firstStart ? firstStart.id : null;
                  const textId =
                    typeof startId === "string" ? startId : "prefill-think-t";
                  controller.enqueue({ type: "text-start", id: textId });
                  controller.enqueue({
                    type: "text-delta",
                    id: textId,
                    delta: forcedAccum,
                  });
                  controller.enqueue({ type: "text-end", id: textId });
                }
              }
              pendingTextStarts = [];
              mode = "text";
              controller.enqueue(chunk);
              return;
            }

            controller.enqueue(chunk);
          },
        }),
      );

      return { stream: transformed, ...rest };
    },
  };
}
