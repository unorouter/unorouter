import { env } from "@/lib/config/env";

// The plugin and Lua httpRequest bindings both run in the HOST page, not the
// sandboxed iframe, so a same-origin URL would carry the user's session
// cookies: guest code could read /api/billing/token/best-key and POST the key
// anywhere. Deny our own origins, and never attach credentials.
export async function guestFetch(
  url: string,
): Promise<{ status: number; data: string }> {
  if (url.length > 120) {
    return { status: 413, data: "URL too large. max is 120 characters" };
  }
  if (!url.startsWith("https://")) {
    return { status: 400, data: "Only https requests are allowed" };
  }
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return { status: 400, data: "Only https requests are allowed" };
  }
  if (origin === env.siteOrigin || origin === env.apiOrigin) {
    return { status: 403, data: "Requests to this site are not allowed" };
  }
  try {
    const d = await fetch(url, { method: "GET", credentials: "omit" });
    return { status: d.status, data: await d.text() };
  } catch {
    return { status: 400, data: "internal error" };
  }
}
