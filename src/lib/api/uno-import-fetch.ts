import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";

// Orval mutator: the generated fetchers build a relative path, so this puts the
// service origin in front. Called from the BROWSER, safe because the import
// endpoints take no token and allow this origin.
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
    // Uncaught this surfaces as the browser's bare "Failed to fetch".
    throw new Error(msg("ERRORS.CARD_IMPORT_UNAVAILABLE"));
  }

  const text = [204, 205, 304].includes(res.status) ? null : await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // A gateway 502 page is HTML; a parse throw escapes before any status
      // check, so a routing outage would read as a JSON syntax error.
      data = { error: text.slice(0, 300) };
    }
  }
  return { data, status: res.status, headers: res.headers } as T;
}
