import { env } from "@/lib/config/env";

const upstreamApiUrl =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? env.apiUrl)
    : env.apiUrl;

const upstreamIsProxied = upstreamApiUrl === env.apiUrl;

const REQUEST_TIMEOUT = 30_000;

// Elysia answers a thrown value through its toResponse, so a pass-through route
// hands the caller the upstream status and body instead of an empty 500.
export class UpstreamError extends Error {
  constructor(
    readonly status: number,
    readonly data: unknown,
    readonly headers: Headers,
  ) {
    super(`upstream answered ${status}`);
    this.name = "UpstreamError";
  }

  toResponse() {
    return Response.json(this.data, { status: this.status });
  }
}

// Spreading a Headers instance or an entry array yields {}, silently dropping
// every header.
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

// "" with no request scope: upstream must record NO client IP rather than the
// socket peer, which is this pod masquerading as a user.
async function getServerHeader(name: string): Promise<string> {
  if (typeof window !== "undefined") return "";
  try {
    const { headers } = await import("next/headers");
    return (await headers()).get(name)?.trim() ?? "";
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
  const cookieHeader = hasExplicitAuth ? "" : await getServerHeader("cookie");
  const hasCookie = !!getHeader(headers, "cookie");
  // A service-token call speaks for the BFF; the gateway trusts that token only
  // from the cluster, so a forwarded visitor IP would make it look external.
  const isServiceCall = !!getHeader(headers, "X-Bff-Service-Token");
  const clientIp =
    hasExplicitAuth ||
    isServiceCall ||
    upstreamIsProxied ||
    getHeader(headers, "CF-Connecting-IP")
      ? ""
      : await getServerHeader("cf-connecting-ip");
  const edgeOnly = hasExplicitAuth || upstreamIsProxied;
  const country =
    edgeOnly || getHeader(headers, "CF-IPCountry")
      ? ""
      : await getServerHeader("cf-ipcountry");
  const ray =
    edgeOnly || getHeader(headers, "CF-Ray")
      ? ""
      : await getServerHeader("cf-ray");
  const userAgent =
    hasExplicitAuth || getHeader(headers, "User-Agent")
      ? ""
      : await getServerHeader("user-agent");

  const res = await fetch(new URL(url, upstreamApiUrl).toString(), {
    ...options,
    credentials: "include",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    headers: {
      ...(cookieHeader && !hasCookie && { cookie: cookieHeader }),
      ...(clientIp && { "CF-Connecting-IP": clientIp }),
      ...(country && { "CF-IPCountry": country }),
      ...(ray && { "CF-Ray": ray }),
      ...(userAgent && { "User-Agent": userAgent }),
      ...(upstreamIsProxied &&
        process.env.EDGE_DEV_TOKEN && {
          "x-edge-dev": process.env.EDGE_DEV_TOKEN,
        }),
      ...headers,
    },
  });

  if (!res.ok) {
    throw new UpstreamError(res.status, await readErrBody(res), res.headers);
  }
  return {
    status: res.status,
    data: await readOkBody(res),
    headers: res.headers,
  } as T;
};
