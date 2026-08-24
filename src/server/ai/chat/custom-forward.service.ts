import { safeFetchStream } from "@/lib/config/safe-fetch";
import { msg } from "@/lib/config/constants";

// Opt-in CORS-bypass proxy for custom providers, open to guests. The
// caller-supplied Authorization is mandatory: it is the only thing keeping this
// from being a free anonymous relay. The key is piped verbatim, never logged or
// stored, and the header-supplied target passes the shared SSRF policy.

const FORWARD_RESPONSE_HEADERS = ["content-type"] as const;

function json(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function forwardCustomProvider(args: {
  targetBase: string | null;
  path: "/chat/completions" | "/models";
  method: "GET" | "POST";
  authorization: string | null;
  body?: string;
  signal?: AbortSignal;
}): Promise<Response> {
  const base = (args.targetBase ?? "").trim().replace(/\/+$/, "");
  if (!base) return json(400, msg("ERRORS.INVALID_URL"));
  if (!args.authorization) return json(401, msg("ERRORS.NO_API_KEY"));

  let upstream;
  try {
    upstream = await safeFetchStream(`${base}${args.path}`, {
      method: args.method,
      headers: {
        authorization: args.authorization,
        ...(args.method === "POST"
          ? { "content-type": "application/json" }
          : {}),
        accept: "*/*",
      },
      body: args.body,
      signal: args.signal,
    });
  } catch (err) {
    return json(502, err instanceof Error ? err.message : "upstream error");
  }

  const headers = new Headers();
  for (const h of FORWARD_RESPONSE_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
