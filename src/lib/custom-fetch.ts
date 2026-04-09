import { env } from "@/lib/config/env";
import { getServerCookieHeader } from "@/server/constants";

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

  const response = await fetch(new URL(url, env.apiUrl).toString(), {
    ...options,
    credentials: "include",
    headers: {
      ...(isJsonBody && { "Content-Type": "application/json" }),
      ...(cookieHeader && !hasCookie && { cookie: cookieHeader }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    throw { status: response.status, data, headers: response.headers };
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
