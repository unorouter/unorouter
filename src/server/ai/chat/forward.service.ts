// Token-injecting SSE proxy for the DEFAULT chat path. The browser runs the full chat engine + streamText
// and POSTs the already-assembled OpenAI wire body here. This route resolves the upstream token from cookies
// (never exposed to the browser), enforces the guest free-model gate, and raw-pipes the SSE both directions.
// No assembly, no streamText, no finish-meta - just a pipe. Response headers (x-oneapi-request-id +
// x-newapi-dropped-params) are forwarded so the client's stream collector can drive logEnrich + the toast.

import { getPricingSummary } from "@/lib/api/pricing-cache";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import { uid } from "@/lib/utils/base";
import { API_ENDPOINTS } from "@/lib/ai/endpoints";
import { upstreamApiUrl } from "@/server/constants";

// Headers from new-api the client stream collector reads off the response.
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
}): Promise<Response> {
  const model = typeof args.body.model === "string" ? args.body.model : "";

  // Guest gate: free models only (paid models require an account). Same rule the old /stream route enforced.
  if (args.userId === GUEST_USER_ID) {
    const meta = (await getPricingSummary()).byName.get(model);
    if (!meta?.isFree) {
      return new Response(JSON.stringify({ error: msg("ERRORS.UNAUTHORIZED") }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
  }

  // group rides outside the OpenAI body; new-api reads X-Group. Strip it before forwarding.
  const group = args.body.group;
  const wire = { ...args.body };
  delete wire.group;

  const upstream = await fetch(`${upstreamApiUrl}${API_ENDPOINTS.chatCompletions}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      ...(group && group !== "auto" ? { "X-Group": group } : {}),
      "x-request-id": args.requestId ?? uid(),
    },
    body: JSON.stringify(wire),
  });

  const headers = new Headers();
  for (const h of FORWARD_RESPONSE_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
