import { env } from "@/lib/config/env";
import { getServerCookieHeader } from "@/server/cookie-header";

const upstreamApiUrl =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? env.apiUrl)
    : env.apiUrl;

const REQUEST_TIMEOUT = 30_000;

// Thrown on a non-ok response. A plain object, not an Error subclass, so `catch`
// sees `unknown`; isUpstreamError narrows it without a call-site cast.
export type UpstreamError = {
  status: number;
  data: unknown;
  headers: Headers;
};

export function isUpstreamError(e: unknown): e is UpstreamError {
  return (
    typeof e === "object" &&
    e !== null &&
    "status" in e &&
    typeof e.status === "number"
  );
}

// HeadersInit is a Headers instance, an entry array OR a record; spreading the
// first two yields {}, so every caller reads through this normalized form.
function toHeaderRecord(
  headers: HeadersInit | undefined,
): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

function getHeader(
  headers: Record<string, string>,
  key: string,
): string | undefined {
  return headers[key] ?? headers[key.toLowerCase()];
}

// Cloudflare sends the visitor address as cf-connecting-ip. Returns "" with no
// request scope (build scripts, jobs): upstream must then record NO client IP
// rather than the socket peer, which is this pod masquerading as a user.
async function getServerClientIp(): Promise<string> {
  if (typeof window !== "undefined") return "";
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return (
      h.get("cf-connecting-ip")?.trim() ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip")?.trim() ??
      ""
    );
  } catch {
    return "";
  }
}

async function readOkBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json();
  if (
    ct &&
    !ct.startsWith("text/") &&
    !ct.includes("json") &&
    !ct.includes("xml")
  )
    return res.blob();
  return res.text();
}

async function readErrBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const headers = toHeaderRecord(options.headers);
  const hasExplicitAuth = !!getHeader(headers, "Authorization");
  const cookieHeader = hasExplicitAuth ? "" : await getServerCookieHeader();
  const hasCookie = !!getHeader(headers, "cookie");
  const clientIp =
    hasExplicitAuth || getHeader(headers, "X-Forwarded-For")
      ? ""
      : await getServerClientIp();

  const res = await fetch(new URL(url, upstreamApiUrl).toString(), {
    ...options,
    credentials: "include",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    headers: {
      ...(cookieHeader && !hasCookie && { cookie: cookieHeader }),
      ...(clientIp && { "X-Forwarded-For": clientIp }),
      ...headers,
    },
  });

  if (!res.ok) {
    throw {
      status: res.status,
      data: await readErrBody(res),
      headers: res.headers,
    } satisfies UpstreamError;
  }
  return {
    status: res.status,
    data: await readOkBody(res),
    headers: res.headers,
  } as T;
};
