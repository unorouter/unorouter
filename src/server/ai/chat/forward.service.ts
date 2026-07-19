import { getPricingSummary } from "@/lib/api/pricing-cache";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import { uid } from "@/lib/utils/base";
import { API_ENDPOINTS } from "@/lib/ai/endpoints";
import { upstreamApiUrl } from "@/server/constants";
import { serverEnv } from "@/server/env";

const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "x-oneapi-request-id",
  "x-newapi-dropped-params",
] as const;

type WireBody = { model?: string; group?: string | null } & Record<
  string,
  unknown
>;

export async function forwardChatCompletions(args: {
  apiKey: string;
  userId: number;
  body: WireBody;
  requestId: string | null;
  group?: string | null;
}): Promise<Response> {
  const model = typeof args.body.model === "string" ? args.body.model : "";

  if (args.userId === GUEST_USER_ID) {
    const meta = (await getPricingSummary()).byName.get(model);
    if (!meta?.isFree) {
      return new Response(
        JSON.stringify({ error: msg("ERRORS.UNAUTHORIZED") }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }

  if (args.userId !== GUEST_USER_ID && args.apiKey === serverEnv.guestApiKey) {
    const meta = (await getPricingSummary()).byName.get(model);
    if (!meta?.isFree) {
      return new Response(
        JSON.stringify({
          error: `Your session expired, so this request used the guest key (free models only). Log in again to use ${model}.`,
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }
  }

  // The sdk transport builds the wire body itself, so the billing-group pin
  // rides the X-Group request header; body.group covers legacy callers.
  const group = args.body.group ?? args.group;
  const wire = { ...args.body };
  delete wire.group;

  const abort = new AbortController();
  const upstreamPromise = fetch(
    `${upstreamApiUrl}${API_ENDPOINTS.chatCompletions}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
        ...(group && group !== "auto" ? { "X-Group": group } : {}),
        "x-request-id": args.requestId ?? uid(),
      },
      body: JSON.stringify(wire),
      signal: abort.signal,
    },
  );

  // Fast path: upstream headers within the grace window flow through verbatim
  // (real status + the meta headers the client's finish collector reads).
  const winner = await Promise.race([
    upstreamPromise,
    new Promise<"slow">((res) => setTimeout(() => res("slow"), EARLY_FLUSH_MS)),
  ]);
  if (winner !== "slow") {
    const upstream = winner;
    const headers = new Headers();
    for (const h of FORWARD_RESPONSE_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  // Slow path: upstream is still retrying across channels. Cloudflare kills a
  // byte-less origin response at ~100s (524, its raw HTML then lands in the
  // chat as the "reply"), so commit to a 200 SSE now and heartbeat with SSE
  // comments until upstream produces headers. A late upstream error is
  // re-framed as an OpenAI-style error chunk, which the ai-sdk client surfaces
  // through its normal stream-error path.
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(": keepalive\n\n"));
        } catch {
          clearInterval(ping);
        }
      }, KEEPALIVE_MS);
      controller.enqueue(enc.encode(": keepalive\n\n"));
      const writeError = (message: string) => {
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify({ error: { message } })}\n\n`),
        );
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
      };
      try {
        const upstream = await upstreamPromise;
        clearInterval(ping);
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          writeError(compactErrorText(text, upstream.status));
        } else {
          const reader = upstream.body.getReader();
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            controller.enqueue(chunk.value);
          }
        }
      } catch (e) {
        writeError(String(e).slice(0, 300));
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

const EARLY_FLUSH_MS = 30_000;
const KEEPALIVE_MS = 15_000;

// An upstream error body can be a full Cloudflare HTML page; strip markup and
// cap it so the chat shows a short line instead of 4KB of raw HTML.
function compactErrorText(text: string, status: number): string {
  const plain = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const detail = plain.slice(0, 200);
  return detail
    ? `Upstream error (HTTP ${status}): ${detail}`
    : `Upstream error (HTTP ${status})`;
}
