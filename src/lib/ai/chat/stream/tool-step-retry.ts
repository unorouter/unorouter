"use client";

import { rec, safeJsonParse } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";

const MAX_WAIT_S = 60;

function waitFor(ms: number, signal: AbortSignal | null | undefined) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

// A tool loop sends one request per step and a free model allows one a
// minute, so the step after a tool result 429s and the turn ends without its
// answer. Only that continuation waits and goes again, never a user's turn.
export function retryToolStep(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    const res = await inner(input, init);
    if (res.status !== 429 || typeof init?.body !== "string") return res;
    const messages = rec(safeJsonParse<unknown>(init.body, null))?.messages;
    const last = Array.isArray(messages) ? rec(messages.at(-1)) : null;
    if (last?.role !== "tool") return res;
    const text = await res
      .clone()
      .text()
      .catch(() => "");
    const wait = Number(/retry in (\d+)\s*s/i.exec(text)?.[1]);
    if (!Number.isFinite(wait) || wait > MAX_WAIT_S) return res;
    logChatDebug("tool.step_retry", { waitS: wait });
    await waitFor((wait + 1) * 1000, init.signal);
    return inner(input, init);
  };
}
