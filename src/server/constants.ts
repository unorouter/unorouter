import { parseSetCookie } from "cookie";

export const ADMIN_HEADERS = {
  Authorization: process.env.SYSTEM_ACCESS_TOKEN,
  "New-Api-User": "1",
};

export async function getServerCookieHeader(): Promise<string> {
  if (typeof window !== "undefined") return "";
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  } catch {
    return "";
  }
}

export async function forwardUpstreamCookies(headers: Headers) {
  if (typeof window !== "undefined") return;
  const raw = headers.getSetCookie?.() ?? [];
  if (raw.length === 0) return;

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    for (const str of raw) {
      const parsed = parseSetCookie(str);
      delete parsed.domain;
      parsed.secure = false;
      parsed.sameSite = "lax";
      const { name, value, ...opts } = parsed;
      cookieStore.set(name, value ?? "", opts);
    }
  } catch {
    // not in a request context
  }
}
