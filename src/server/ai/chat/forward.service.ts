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

  const group = args.body.group;
  const wire = { ...args.body };
  delete wire.group;

  const upstream = await fetch(
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
    },
  );

  const headers = new Headers();
  for (const h of FORWARD_RESPONSE_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
