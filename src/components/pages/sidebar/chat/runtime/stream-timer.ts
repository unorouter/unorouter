import { logChatDebug } from "@/lib/utils/chat-debug-log";

const LAG_PROBE_MS = 250;

// Splits one reply's wait into phases, so a slow report shows whether the time
// went to our assembly, the upstream's first byte, its thinking, or a busy page.
export function makeStreamTimer(model: string) {
  const t0 = performance.now();
  const marks: Record<string, number> = {};
  let rawBytes = 0;
  let maxLagMs = 0;
  let totalLagMs = 0;
  let lagTimer: ReturnType<typeof setInterval> | undefined;
  let done = false;
  const at = () => Math.round(performance.now() - t0);
  const mark = (name: string) => {
    if (!(name in marks)) marks[name] = at();
  };

  const startLagProbe = () => {
    let expected = performance.now() + LAG_PROBE_MS;
    lagTimer = setInterval(() => {
      const now = performance.now();
      const lag = now - expected;
      if (lag > 50) {
        totalLagMs += lag;
        maxLagMs = Math.max(maxLagMs, lag);
      }
      expected = now + LAG_PROBE_MS;
    }, LAG_PROBE_MS);
  };

  return {
    mark,
    wrapFetch(inner: typeof fetch): typeof fetch {
      return async (input, init) => {
        mark("fetchStart");
        startLagProbe();
        const res = await inner(input, init);
        mark("headers");
        if (!res.body) return res;
        const counted = res.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              if (rawBytes === 0) mark("firstByte");
              rawBytes += chunk.byteLength;
              marks.lastByte = at();
              controller.enqueue(chunk);
            },
          }),
        );
        return new Response(counted, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      };
    },
    end(outcome: string, extra: Record<string, unknown> = {}) {
      if (done) return;
      done = true;
      clearInterval(lagTimer);
      logChatDebug("stream.timing", {
        model,
        outcome,
        totalMs: at(),
        ...marks,
        rawBytes,
        maxLagMs: Math.round(maxLagMs),
        totalLagMs: Math.round(totalLagMs),
        ...extra,
      });
    },
  };
}
