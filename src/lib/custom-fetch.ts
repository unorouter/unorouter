import { env } from "@/lib/config/env";
import { getServerCookieHeader } from "@/server/constants";

const upstreamApiUrl =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? env.apiUrl)
    : env.apiUrl;

const REQUEST_TIMEOUT = 30_000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF = [500, 1000];
const RETRYABLE = new Set([502, 503, 504]);

function getHeaderValue(
  headers: HeadersInit | undefined,
  key: string,
): string | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) return headers.get(key) ?? undefined;
  if (Array.isArray(headers))
    return headers.find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
  return (headers as Record<string, string>)[key];
}

/**
 * Orval mutator: T is the full Orval response envelope (e.g. { data: D; status: 200; headers: Headers }).
 * The function constructs this envelope from the fetch response.
 */
export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  let isJsonBody = false;
  if (typeof options.body === "string") {
    try {
      JSON.parse(options.body);
      isJsonBody = true;
    } catch {}
  }

  const cookieHeader = await getServerCookieHeader();
  const hasCookie =
    getHeaderValue(options.headers, "cookie") ||
    getHeaderValue(options.headers, "Cookie");

  const method = (options.method ?? "GET").toUpperCase();

  const doFetch = () =>
    fetch(new URL(url, upstreamApiUrl).toString(), {
      ...options,
      credentials: "include",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers: {
        ...(isJsonBody && { "Content-Type": "application/json" }),
        ...(cookieHeader && !hasCookie && { cookie: cookieHeader }),
        ...options.headers,
      },
    });

  let response: Response;
  let lastError: unknown;

  for (let attempt = 0; ; attempt++) {
    try {
      response = await doFetch();

      if (response.ok) break;

      if (
        attempt < MAX_RETRIES &&
        method === "GET" &&
        RETRYABLE.has(response.status)
      ) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF[attempt]));
        continue;
      }

      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      throw { status: response.status, data, headers: response.headers };
    } catch (err) {
      if (
        attempt < MAX_RETRIES &&
        method === "GET" &&
        err instanceof TypeError
      ) {
        lastError = err;
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF[attempt]));
        continue;
      }
      throw lastError ?? err;
    }
  }

  const contentType = response.headers.get("content-type");

  let data: unknown;
  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else if (
    contentType &&
    !contentType.startsWith("text/") &&
    !contentType.includes("json") &&
    !contentType.includes("xml")
  ) {
    data = await response.blob();
  } else {
    data = await response.text();
  }

  // SAFETY: T is the Orval-generated envelope type { data, status, headers }
  return { status: response.status, data, headers: response.headers } as T;
};
