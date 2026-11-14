"use client";

import { logChatDebug } from "@/lib/utils/chat-debug-log";

const MAX_RESUMES = 6;
// A tab back from the background whose stream has said nothing for this long
// is on a connection the OS already dropped without telling it.
const STALE_ON_RETURN_MS = 20_000;

const visibleAgain = () =>
  document.visibilityState === "visible"
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const onChange = () => {
          if (document.visibilityState !== "visible") return;
          document.removeEventListener("visibilitychange", onChange);
          resolve();
        };
        document.addEventListener("visibilitychange", onChange);
      });

// The forward route keeps reading a reply after the connection drops (an iOS
// tab is frozen seconds after it hides) and serves the rest from a byte
// offset, so a broken read here continues where it stopped instead of failing.
export function resumableFetch(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    const res = await inner(input, init);
    const id = res.headers.get("x-uno-stream");
    if (!id || !res.body) return res;
    const path = `/api/ai/chat/resume/${encodeURIComponent(id)}`;
    const signal = init?.signal ?? null;

    let reader = res.body.getReader();
    let received = 0;
    let resumes = 0;
    let completed = false;
    let stopped = false;
    let broken: unknown = null;
    let lastDataAt = Date.now();

    // Stop and regenerate end the generation on the server too; a dropped
    // connection is the only thing that leaves it running.
    const stopServer = () => {
      if (completed || stopped) return;
      stopped = true;
      void fetch(path, { method: "DELETE", keepalive: true });
    };
    signal?.addEventListener("abort", stopServer, { once: true });

    const onVisible = () => {
      if (document.visibilityState !== "visible" || completed || broken) return;
      if (Date.now() - lastDataAt < STALE_ON_RETURN_MS) return;
      broken = new Error("stale stream on return");
      reader.cancel().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    const settle = () => {
      document.removeEventListener("visibilitychange", onVisible);
      signal?.removeEventListener("abort", stopServer);
    };

    const resume = async () => {
      if (signal?.aborted || resumes >= MAX_RESUMES) throw broken;
      resumes++;
      await visibleAgain();
      await new Promise((r) => setTimeout(r, 300 * resumes));
      const next = await fetch(`${path}?from=${received}`, { signal }).catch(
        () => null,
      );
      logChatDebug("stream.resume", {
        attempt: resumes,
        from: received,
        status: next?.status ?? null,
        cause: String(broken).slice(0, 120),
      });
      if (next?.status === 404) throw broken;
      if (!next?.ok || !next.body) return;
      reader = next.body.getReader();
      broken = null;
      lastDataAt = Date.now();
    };

    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        for (;;) {
          if (broken) {
            try {
              await resume();
            } catch (final) {
              settle();
              throw final;
            }
            continue;
          }
          let chunk: ReadableStreamReadResult<Uint8Array>;
          try {
            chunk = await reader.read();
          } catch (err) {
            broken = err;
            continue;
          }
          // A reader cancelled by the stale check reports done; `broken` says why.
          if (broken) continue;
          if (chunk.done) {
            completed = true;
            settle();
            controller.close();
            return;
          }
          received += chunk.value.byteLength;
          lastDataAt = Date.now();
          controller.enqueue(chunk.value);
          return;
        }
      },
      cancel(reason) {
        stopServer();
        settle();
        reader.cancel(reason).catch(() => {});
      },
    });

    return new Response(body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  };
}
