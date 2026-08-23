import { serverEnv } from "@/server/env";

// Orval mutator for the uno-import client. The generated fetchers build a
// relative path and send no credentials, and uno-import is reachable only from
// inside the cluster behind a bearer token, so every call goes through here to
// get the base URL and the header attached.
export async function unoImportFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${serverEnv.unoImportUrl}${url}`, {
    ...init,
    headers: {
      ...init?.headers,
      authorization: `Bearer ${serverEnv.unoImportToken}`,
      "content-type": "application/json",
    },
  });

  const text = [204, 205, 304].includes(res.status) ? null : await res.text();
  const data: unknown = text ? JSON.parse(text) : {};
  return { data, status: res.status, headers: res.headers } as T;
}
