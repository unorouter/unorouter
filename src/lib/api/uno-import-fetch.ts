import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";

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
    throw new Error(msg("ERRORS.CARD_IMPORT_UNAVAILABLE"));
  }

  const text = [204, 205, 304].includes(res.status) ? null : await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 300) };
    }
  }
  return { data, status: res.status, headers: res.headers } as T;
}
