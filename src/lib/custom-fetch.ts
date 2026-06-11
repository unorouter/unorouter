import { env } from "@/lib/config/env";
import { getServerCookieHeader } from "@/server/constants";

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

// Success body: strict by content-type (json -> object, binary -> blob, else
// raw text; never speculatively parse a text body that looks like JSON).
async function readOkBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json();
  if (ct && !ct.startsWith("text/") && !ct.includes("json") && !ct.includes("xml"))
    return res.blob();
  return res.text();
}

// Error body: parse JSON when possible, else the raw text.
async function readErrBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Orval mutator. Callers always pass `options.headers` as a plain object.
export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const headers = options.headers as Record<string, string> | undefined;
  // Skip auto-cookie when Authorization is set (ADMIN_HEADERS): upstream
  // prefers the cookie, causing a New-Api-User mismatch.
  const hasExplicitAuth = !!getHeader(headers, "Authorization");
  const cookieHeader = hasExplicitAuth ? "" : await getServerCookieHeader();
  const hasCookie = !!getHeader(headers, "cookie");

  const res = await fetch(new URL(url, upstreamApiUrl).toString(), {
    ...options,
    credentials: "include",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    headers: {
      ...(cookieHeader && !hasCookie && { cookie: cookieHeader }),
      ...headers,
    },
  });

  if (!res.ok) {
    throw { status: res.status, data: await readErrBody(res), headers: res.headers };
  }
  return { status: res.status, data: await readOkBody(res), headers: res.headers } as T;
};
