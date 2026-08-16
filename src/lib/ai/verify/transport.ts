import { errMessage } from "@/lib/utils/base";
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

// A CORS block and a dead host both surface as an opaque TypeError, so the
// rejection alone cannot separate them. Retrying in "no-cors" mode can: that
// mode skips the CORS check, so it still resolves when only CORS was in the way
// and still rejects when nothing is listening.
// See https://github.com/whatwg/fetch/issues/1123.
//
// The retry is deliberately NOT the original request. no-cors strips the
// Authorization header and forces a safelisted content-type, so it proves
// reachability only; the response is opaque by design and never inspected.
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
    const wrapped = (await res.json().catch(() => null)) as {
      data?: { status: number; data: unknown };
    } | null;
    const inner = wrapped?.data;
    if (!inner)
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
