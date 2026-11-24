import {
  safeFetchStream,
  safeFetchStreamFollow,
} from "@/lib/config/safe-fetch";
import { msg } from "@/lib/config/constants";
import { resumableResponse } from "./stream-buffer";

// Opt-in CORS-bypass proxy for custom providers, open to guests. The
// caller-supplied Authorization is mandatory. The key is piped verbatim, never
// logged or stored, and the header-supplied target passes the shared SSRF policy.

const FORWARD_RESPONSE_HEADERS = ["content-type", "content-length"] as const;
const MAX_MEDIA_BYTES = 300 * 1024 * 1024;

function json(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Media endpoints the proxy may reach. A job id segment cannot climb out of
// its collection, so the caller never picks an arbitrary path on the host.
const JOB_ID = String.raw`[\w.:-]{1,200}`;
const MEDIA_PATHS: { method: "GET" | "POST"; re: RegExp }[] = [
  { method: "POST", re: /^\/images\/(generations|edits)$/ },
  { method: "POST", re: /^\/videos$/ },
  { method: "POST", re: /^\/video\/generations$/ },
  { method: "GET", re: new RegExp(`^/videos/${JOB_ID}(/content)?$`) },
  { method: "GET", re: new RegExp(`^/video/generations/${JOB_ID}$`) },
];

export function customForwardPath(request: Request): string {
  const path = new URL(request.url).pathname;
  return path.slice(path.indexOf("/custom-forward") + "/custom-forward".length);
}

export function isMediaForwardPath(method: string, path: string): boolean {
  return MEDIA_PATHS.some((p) => p.method === method && p.re.test(path));
}

export async function forwardCustomProvider(args: {
  targetBase: string | null;
  path: string;
  method: "GET" | "POST";
  authorization: string | null;
  body?: string | ArrayBuffer;
  contentType?: string | null;
  signal?: AbortSignal;
  // Signed-in callers only: their reply keeps streaming into the relay pool
  // after the tab drops, so it can be resumed.
  resumeFor?: number | null;
}): Promise<Response> {
  const base = (args.targetBase ?? "").trim().replace(/\/+$/, "");
  // a query or fragment would swallow the fixed path and let the caller pick it
  if (!base || /[?#]/.test(base)) return json(400, msg("ERRORS.INVALID_URL"));
  const fixed =
    (args.method === "POST" && args.path === "/chat/completions") ||
    (args.method === "GET" && args.path === "/models");
  if (!fixed && !isMediaForwardPath(args.method, args.path))
    return json(404, msg("ERRORS.NOT_FOUND"));
  if (!args.authorization) return json(401, msg("ERRORS.NO_API_KEY"));

  const own = args.resumeFor == null ? null : new AbortController();
  let upstream;
  try {
    upstream = await safeFetchStream(`${base}${args.path}`, {
      method: args.method,
      headers: {
        authorization: args.authorization,
        ...(args.method === "POST"
          ? { "content-type": args.contentType || "application/json" }
          : {}),
        accept: "*/*",
      },
      body: args.body,
      signal: own?.signal ?? args.signal,
    });
  } catch (err) {
    return json(502, err instanceof Error ? err.message : "upstream error");
  }

  const headers = new Headers();
  for (const h of FORWARD_RESPONSE_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (own && args.resumeFor != null && upstream.ok && upstream.body)
    return resumableResponse(
      upstream.body,
      args.resumeFor,
      own,
      upstream.status,
      headers,
      "relay",
    );
  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

// A provider-chosen result URL. The caller's key is attached only when the URL
// is on the provider's own origin, so a CDN or third host never receives it.
export async function forwardCustomMedia(args: {
  targetBase: string | null;
  url: string | null;
  authorization: string | null;
  signal?: AbortSignal;
}): Promise<Response> {
  let target: URL;
  let base: URL;
  try {
    target = new URL(args.url ?? "");
    base = new URL((args.targetBase ?? "").trim());
  } catch {
    return json(400, msg("ERRORS.INVALID_URL"));
  }
  const sameOrigin = target.origin === base.origin;
  let upstream;
  try {
    upstream = await safeFetchStreamFollow(target.toString(), {
      headers: {
        accept: "*/*",
        ...(sameOrigin && args.authorization
          ? { authorization: args.authorization }
          : {}),
      },
      signal: args.signal,
      maxBytes: MAX_MEDIA_BYTES,
    });
  } catch (err) {
    return json(502, err instanceof Error ? err.message : "upstream error");
  }
  const headers = new Headers();
  for (const h of FORWARD_RESPONSE_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
