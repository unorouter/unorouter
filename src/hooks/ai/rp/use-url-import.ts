"use client";

import {
  getApiJobsById,
  postApiJobs,
  type GetApiJobsById200,
} from "@/lib/api/uno-import";
import { msg } from "@/lib/config/constants";

// uno-import is called straight from the browser: it takes no token, its sources
// are a fixed whitelist, and it allows this origin. It runs a real browser per job
// and may rotate its VPN exit mid-job, hence job id plus polling: holding the
// request open turns a slow import into a browser timeout with nothing to report.
// The server retries to its own deadline, so this only outlasts a fetch plus a few
// exit rotations.
const POLL_MS = 1500;
const POLL_TIMEOUT_MS = 180_000;

// Generated from uno-import's OpenAPI document, so a new result kind is a compile
// error rather than a silently ignored shape. Never hand-write a mirror of it.
export type ImportedResult = NonNullable<GetApiJobsById200["result"]>;

// uno-import's ROUTE rejections are fixed codes.
const SUBMIT_ERRORS: Record<string, string> = {
  "unsupported source": msg("ERRORS.CARD_IMPORT_UNSUPPORTED"),
  "too many jobs in flight": msg("ERRORS.CARD_IMPORT_TOO_MANY"),
  "invalid url": msg("ERRORS.CARD_IMPORT_INVALID_URL"),
  "https only": msg("ERRORS.CARD_IMPORT_INVALID_URL"),
  "not found": msg("ERRORS.CARD_IMPORT_JOB_GONE"),
};

// Job errors are log strings ("datacat: not_found (at <url>)"). Unlike the route
// codes above, uno-import's 45 ADAPTER errors are prose, so substring matching is
// the only option until they get codes. Unmatched falls back to the generic
// message, so drift costs a vaguer sentence, never a wrong one.
function importFailureMessage(raw: string | null | undefined): string {
  const e = (raw ?? "").toLowerCase();
  if (!e) return msg("ERRORS.CARD_IMPORT_FETCH_FAILED");
  if (e.includes("timed out")) return msg("ERRORS.CARD_IMPORT_TIMED_OUT");
  if (e.includes("private") || e.includes("downloads disabled"))
    return msg("ERRORS.CARD_IMPORT_PRIVATE");
  // uno-import retries a transient rejection to its deadline, so this reaching
  // the user means the id stayed gone.
  if (e.includes("not_found") || e.includes("no longer exists"))
    return msg("ERRORS.CARD_IMPORT_NOT_FOUND");
  if (e.includes("no character id") || e.includes("no lorebook id"))
    return msg("ERRORS.CARD_IMPORT_INVALID_URL");
  if (e.includes("empty") || e.includes("no importable"))
    return msg("ERRORS.CARD_IMPORT_EMPTY");
  return msg("ERRORS.CARD_IMPORT_FETCH_FAILED");
}

// Route rejections are {error: <literal>}, but a 422 is Elysia's validation shape
// and carries no error field at all.
function rejected(body: object): Error {
  const code =
    "error" in body && typeof body.error === "string" ? body.error : "";
  return new Error(
    SUBMIT_ERRORS[code] ?? msg("ERRORS.CARD_IMPORT_FETCH_FAILED"),
  );
}

export async function runUrlImport<T>(
  url: string,
  persist: (result: ImportedResult) => Promise<T>,
): Promise<T> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }
  if (parsed.protocol !== "https:") {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }

  const submitted = await postApiJobs({ url: parsed.href });
  if (submitted.status !== 200) throw rejected(submitted.data);

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
    const polled = await getApiJobsById(submitted.data.jobId);
    if (polled.status !== 200) throw rejected(polled.data);

    const state: GetApiJobsById200 = polled.data;
    if (state.status === "failed") {
      throw new Error(importFailureMessage(state.error));
    }
    if (state.status !== "done" || !state.result) continue;
    return persist(state.result);
  }
}
