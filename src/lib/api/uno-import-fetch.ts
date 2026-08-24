import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";

// Orval mutator for the uno-import client. The generated fetchers build a
// relative path, so this is what puts the service's own origin in front of it.
// Called from the BROWSER: the import endpoints take no token and allow this
// origin, so there is nothing here a page may not do for itself.
export async function unoImportFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.cardsUrl}${url}`, {
      ...init,
      headers: { ...init?.headers, "content-type": "application/json" },
    });
  } catch {
    // Service unreachable. Left uncaught this surfaces as the browser's bare
    // "Failed to fetch", which is the whole explanation the user would get.
    throw new Error(msg("ERRORS.CARD_IMPORT_UNAVAILABLE"));
  }

  const text = [204, 205, 304].includes(res.status) ? null : await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // A gateway 502 page is HTML, and a parse throw here escapes before any
      // status check, so a routing outage reads as a JSON syntax error.
      data = { error: text.slice(0, 300) };
    }
  }
  return { data, status: res.status, headers: res.headers } as T;
}
