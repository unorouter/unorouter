import type { LanguageModelMiddleware } from "ai";
import type { StreamChunk } from "./prefill-think-middleware";

// Some upstreams put `tool_calls: []` on every delta, and the openai-compatible
// provider closes the reasoning part on any non-null tool_calls, so a 400 token
// thought arrives as 400 one-word reasoning parts. A reasoning-end is held back
// until the next chunk; a restart of the same id cancels the pair.
export function coalesceReasoningMiddleware(): LanguageModelMiddleware {
  return {
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      let heldEnd: StreamChunk | null = null;
      const transformed = stream.pipeThrough(
        new TransformStream<StreamChunk, StreamChunk>({
          transform(chunk, controller) {
            if (heldEnd) {
              if (
                chunk.type === "reasoning-start" &&
                heldEnd.type === "reasoning-end" &&
                chunk.id === heldEnd.id
              ) {
                heldEnd = null;
                return;
              }
              controller.enqueue(heldEnd);
              heldEnd = null;
            }
            if (chunk.type === "reasoning-end") {
              heldEnd = chunk;
              return;
            }
            controller.enqueue(chunk);
          },
          flush(controller) {
            if (heldEnd) controller.enqueue(heldEnd);
          },
        }),
      );
      return { stream: transformed, ...rest };
    },
  };
}
