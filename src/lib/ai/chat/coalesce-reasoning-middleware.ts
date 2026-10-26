import type { LanguageModelMiddleware } from "ai";
import type { StreamChunk } from "./prefill-think-middleware";

const NATIVE = "native-";

// Innermost: marks the provider's own reasoning, whose "reasoning-0" ids
// otherwise collide with the ones extractReasoningMiddleware mints.
export function nativeReasoningMiddleware(): LanguageModelMiddleware {
  return {
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      const transformed = stream.pipeThrough(
        new TransformStream<StreamChunk, StreamChunk>({
          transform(chunk, controller) {
            controller.enqueue(
              chunk.type === "reasoning-start" ||
                chunk.type === "reasoning-delta" ||
                chunk.type === "reasoning-end"
                ? { ...chunk, id: NATIVE + chunk.id }
                : chunk,
            );
          },
        }),
      );
      return { stream: transformed, ...rest };
    },
  };
}

// Upstreams split one thought into many parts: `tool_calls: []` or a blank
// `content` on every reasoning delta, or the same thought sent twice, as
// reasoning_content and inside <think> tags. One part stays open under its
// own id, fed by whichever channel spoke first, until real text, a tool call
// or the finish arrives.
export function coalesceReasoningMiddleware(): LanguageModelMiddleware {
  return {
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      let open: string | null = null;
      let native = false;
      let count = 0;
      let endMetadata: StreamChunk | null = null;
      const startedText = new Set<string>();

      const close = (
        controller: TransformStreamDefaultController<StreamChunk>,
      ) => {
        if (open === null) return;
        controller.enqueue(
          endMetadata && endMetadata.type === "reasoning-end"
            ? { ...endMetadata, id: open }
            : { type: "reasoning-end", id: open },
        );
        open = null;
        endMetadata = null;
      };

      const transformed = stream.pipeThrough(
        new TransformStream<StreamChunk, StreamChunk>({
          transform(chunk, controller) {
            switch (chunk.type) {
              case "reasoning-start":
              case "reasoning-delta":
                if (open !== null && chunk.id.startsWith(NATIVE) !== native)
                  return;
                if (open === null) {
                  native = chunk.id.startsWith(NATIVE);
                  open = `coalesced-reasoning-${count++}`;
                  controller.enqueue({ type: "reasoning-start", id: open });
                }
                if (chunk.type === "reasoning-delta")
                  controller.enqueue({ ...chunk, id: open });
                return;
              case "reasoning-end":
                endMetadata = chunk;
                return;
              case "text-start":
                return;
              case "text-delta":
                if (open !== null && !chunk.delta.trim()) return;
                close(controller);
                if (!startedText.has(chunk.id)) {
                  startedText.add(chunk.id);
                  controller.enqueue({ type: "text-start", id: chunk.id });
                }
                controller.enqueue(chunk);
                return;
              case "text-end":
                if (startedText.delete(chunk.id)) controller.enqueue(chunk);
                return;
              default:
                close(controller);
                controller.enqueue(chunk);
            }
          },
          flush(controller) {
            close(controller);
          },
        }),
      );
      return { stream: transformed, ...rest };
    },
  };
}
