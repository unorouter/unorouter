import { safeFetchStream } from "@/lib/config/safe-fetch";
import { msg } from "@/lib/config/constants";

// Opt-in server proxy for custom providers whose endpoints lack CORS: the
// browser cannot call them directly, so the request detours through here and
// gets raw-piped both ways. The user's own key rides the Authorization header
// verbatim and is never logged or stored; the target comes from a header and
// passes the same SSRF policy as every other server-side fetch (public DNS
// only, http/https on 80/443, redirects refused).

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

  let upstream;
  try {
    upstream = await safeFetchStream(`${base}${args.path}`, {
      method: args.method,
      headers: {
        ...(args.authorization ? { authorization: args.authorization } : {}),
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
  return new Response(upstream.body as BodyInit | null, {
    status: upstream.status,
    headers,
  });
}
