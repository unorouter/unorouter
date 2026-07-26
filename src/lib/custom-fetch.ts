import { env } from "@/lib/config/env";
import { getServerCookieHeader } from "@/server/cookie-header";

const upstreamApiUrl =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? env.apiUrl)
    : env.apiUrl;

const REQUEST_TIMEOUT = 30_000;

function getHeader(
  headers: Record<string, string> | undefined,
  key: string,
): string | undefined {
  return headers?.[key] ?? headers?.[key.toLowerCase()];
}

// Cloudflare sends the visitor address as cf-connecting-ip; x-forwarded-for is
// the fallback for any other hop. Returns "" when there is no request scope
// (static prerender, background revalidate), where no visitor exists to name.
// Upstream must then record NO client IP rather than fall back to the socket
// peer, which is this pod and would masquerade as a real user address.
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
  const headers = options.headers as Record<string, string> | undefined;
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
    };
  }
  return {
    status: res.status,
    data: await readOkBody(res),
    headers: res.headers,
  } as T;
};
