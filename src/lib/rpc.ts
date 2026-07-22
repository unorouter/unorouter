import type { App } from "@/app/api/[[...route]]/route";
import { treaty } from "@elysiajs/eden";

const REFRESH_PATH = "/api/auth/account/auth/refresh";

// Single-flight refresh: concurrent 401s share ONE refresh call. Resolves to
// true when the session was renewed (caller retries), false otherwise (caller
// lets the 401 surface to the existing auth-error / guest-reset handling).
let inFlightRefresh: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = (async () => {
    try {
      const res = await fetch(REFRESH_PATH, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      inFlightRefresh = null;
    }
  })();
  return inFlightRefresh;
}

// A fetch wrapper that, on a 401 from the BFF, runs one deduped refresh then
// retries the original request once. The refresh route itself is exempt so a
// failed refresh cannot loop. Clone the RequestInit before the first send so
// the retry has a fresh body.
async function refreshingFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.pathname
        : input.url;
  if (url.includes(REFRESH_PATH)) return fetch(input, init);

  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  const refreshed = await refreshSession();
  if (!refreshed) return res;
  return fetch(input, init);
}

export const rpc = treaty<App>(
  typeof window === "undefined"
    ? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
    : window.location.origin,
  {
    fetch: { credentials: "include" },
    ...(typeof window === "undefined" ? {} : { fetcher: refreshingFetch }),
  },
);
