import { msg } from "@/lib/config/constants";
import { serverEnv } from "@/server/env";

// Orval mutator for the uno-import client. The generated fetchers build a
// relative path and send no credentials, and uno-import is reachable only from
// inside the cluster behind a bearer token, so every call goes through here to
// get the base URL and the header attached.
export async function unoImportFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${serverEnv.unoImportUrl}${url}`, {
      ...init,
      headers: {
        ...init?.headers,
        authorization: `Bearer ${serverEnv.unoImportToken}`,
        "content-type": "application/json",
      },
    });
  } catch {
    // Service unreachable. Left uncaught, undici's bare "fetch failed" is what
    // the user reads as the whole explanation of a failed import.
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
