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

function isLikelyCorsError(err: unknown): boolean {
  return err instanceof TypeError;
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
      corsBlocked: !isAbort && isLikelyCorsError(err),
    };
  }
}

async function viaServer(args: TransportArgs): Promise<TransportResult> {
  try {
    const res = await fetch("/api/models/verify/probe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: args.provider,
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
