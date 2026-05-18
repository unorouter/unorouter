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

function getHeader(
  headers: Record<string, string> | undefined,
  key: string,
): string | undefined {
  return headers?.[key] ?? headers?.[key.toLowerCase()];
}

// Orval mutator. Callers always pass `options.headers` as a plain object.
export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const headers = options.headers as Record<string, string> | undefined;

  // Admin (ADMIN_HEADERS) sends explicit Authorization. Upstream checks
  // session cookie first, so forwarding end-user cookie would skip the
  // access-token path and mismatch New-Api-User. Skip auto-attach.
  const hasExplicitAuth = !!getHeader(headers, "Authorization");
  const cookieHeader = hasExplicitAuth ? "" : await getServerCookieHeader();
  const hasCookie = !!getHeader(headers, "cookie");

  const method = (options.method ?? "GET").toUpperCase();

  const doFetch = () =>
    fetch(new URL(url, upstreamApiUrl).toString(), {
      ...options,
      credentials: "include",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers: {
        ...(cookieHeader && !hasCookie && { cookie: cookieHeader }),
        ...headers,
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

  return { status: response.status, data, headers: response.headers } as T;
};
