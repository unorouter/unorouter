import { errMessage, rec } from "@/lib/utils/base";
import type { VerifyProvider, TransportMode } from "./types";

export type TransportResult = {
  status: number | null;
  data: unknown;
  error: string | null;
  corsBlocked: boolean;
};

export type TransportArgs = {
  mode: TransportMode;
  provider: VerifyProvider;
  url: string;
  headers: Record<string, string>;
  reqBody: unknown;
  timeoutMs: number;
};

export type TransportFn = (args: TransportArgs) => Promise<TransportResult>;

// CORS block and dead host both surface as an opaque TypeError
// (whatwg/fetch#1123). no-cors strips Authorization, so this proves reachability
// ONLY and its opaque response must never be inspected.
async function corsBlockedNotUnreachable(
  url: string,
  timeoutMs: number,
): Promise<boolean> {
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: "{}",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return true;
  } catch {
    return false;
  }
}

async function direct(args: TransportArgs): Promise<TransportResult> {
  try {
    const res = await fetch(args.url, {
      method: "POST",
      headers: args.headers,
      body: JSON.stringify(args.reqBody),
      signal: AbortSignal.timeout(args.timeoutMs),
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data, error: null, corsBlocked: false };
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    const msg = errMessage(err);
    return {
      status: null,
      data: null,
      error: isAbort ? "timeout" : msg,
      corsBlocked:
        !isAbort &&
        err instanceof TypeError &&
        (await corsBlockedNotUnreachable(args.url, args.timeoutMs)),
    };
  }
}

async function viaServer(args: TransportArgs): Promise<TransportResult> {
  try {
    const res = await fetch("/api/models/verify/probe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: args.url,
        headers: args.headers,
        reqBody: args.reqBody,
      }),
      signal: AbortSignal.timeout(args.timeoutMs + 5000),
    });
    const wrapped = rec(await res.json().catch(() => null));
    const inner = rec(wrapped?.data);
    if (!inner || typeof inner.status !== "number")
      return {
        status: null,
        data: null,
        error: `proxy HTTP ${res.status}`,
        corsBlocked: false,
      };
    return {
      status: inner.status,
      data: inner.data,
      error: null,
      corsBlocked: false,
    };
  } catch (err) {
    const msg = errMessage(err);
    return { status: null, data: null, error: msg, corsBlocked: false };
  }
}

export function probeTransport(args: TransportArgs): Promise<TransportResult> {
  return args.mode === "server" ? viaServer(args) : direct(args);
}
