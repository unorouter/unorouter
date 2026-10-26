import type { LanguageModelMiddleware } from "ai";
import type { StreamChunk } from "./prefill-think-middleware";

// Upstreams split one thought into many parts: `tool_calls: []` or a blank
// `content` on every reasoning delta, or reasoning_content and <think> tags
// interleaved (whose "reasoning-0" ids also collide). One part stays open
// under its own id until real text, a tool call or the finish arrives.
export function coalesceReasoningMiddleware(): LanguageModelMiddleware {
  return {
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      let open: string | null = null;
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
                if (open === null) {
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
