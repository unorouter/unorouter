import { env } from "@/lib/config/env";
import { logger } from "@/lib/utils/logger";
import { signatureHeaders } from "web-bot-auth";
import { getSigner } from "./keys";

const SIGNATURE_LIFETIME_MS = 5 * 60 * 1000;
const siteOrigin = new URL(env.appUrl).origin;
const apiOrigin = new URL(env.apiUrl).origin;

function resolveUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function shouldSign(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return false;
    if (parsed.origin === siteOrigin) return false;
    if (parsed.origin === apiOrigin) return false;
    return true;
  } catch {
    return false;
  }
}

function mergeHeaders(
  input: string | URL | Request,
  init: RequestInit | undefined,
): Headers {
  const headers = new Headers();
  if (input instanceof Request) {
    for (const [k, v] of input.headers) headers.set(k, v);
  }
  if (init?.headers) {
    for (const [k, v] of new Headers(init.headers)) headers.set(k, v);
  }
  return headers;
}

export async function signedFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url = resolveUrl(input);
  if (!shouldSign(url)) return fetch(input as RequestInfo, init);

  const signer = await getSigner();
  if (!signer) return fetch(input as RequestInfo, init);

  try {
    const headers = mergeHeaders(input, init);
    headers.set("Signature-Agent", `"${siteOrigin}"`);

    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");
    const requestForSigning = new Request(url, { method, headers });

    const now = new Date();
    const sig = await signatureHeaders(requestForSigning, signer, {
      created: now,
      expires: new Date(now.getTime() + SIGNATURE_LIFETIME_MS),
    });
    headers.set("Signature", sig["Signature"]);
    headers.set("Signature-Input", sig["Signature-Input"]);

    return fetch(input as RequestInfo, { ...init, headers });
  } catch (error) {
    logger.warn("Web Bot Auth signing failed, falling back to unsigned", {
      context: "web-bot-auth",
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return fetch(input as RequestInfo, init);
  }
}
