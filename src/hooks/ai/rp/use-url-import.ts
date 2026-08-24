"use client";

import {
  getApiJobsById,
  postApiJobs,
  type GetApiJobsById200,
} from "@/lib/api/uno-import";
import { msg } from "@/lib/config/constants";

// The import service is called straight from the browser: it takes no token,
// its sources are a fixed whitelist, and it allows this origin. A BFF hop in
// front of it added a second error shape to translate and nothing else.
//
// A fetch runs a real browser and may rotate its VPN exit mid-job, so the
// service hands back a job id and the client polls. Holding the request open
// instead turns a slow import into a browser timeout with nothing to report.
//
// The server retries to its own deadline, so this one only has to outlast a
// normal fetch plus a few exit rotations.
const POLL_MS = 1500;
const POLL_TIMEOUT_MS = 180_000;

// Generated from uno-import's own OpenAPI document, so a new result kind is a
// compile error here rather than a shape the client silently ignores. Do not
// hand-write a mirror of it.
export type ImportedResult = NonNullable<GetApiJobsById200["result"]>;

// Rejections from the ROUTE, which are fixed codes rather than prose.
const SUBMIT_ERRORS: Record<string, string> = {
  "unsupported source": msg("ERRORS.CARD_IMPORT_UNSUPPORTED"),
  "too many jobs in flight": msg("ERRORS.CARD_IMPORT_TOO_MANY"),
  "invalid url": msg("ERRORS.CARD_IMPORT_INVALID_URL"),
  "https only": msg("ERRORS.CARD_IMPORT_INVALID_URL"),
  "not found": msg("ERRORS.CARD_IMPORT_JOB_GONE"),
};

// A job error is an internal string built for the logs ("datacat: not_found (at
// <url>)"), so it names the adapter and the page rather than telling the reader
// what to do. Matching substrings is the weak part of this: uno-import's ROUTE
// errors are fixed codes, but its 45 adapter errors are prose, and giving them
// codes is a change across every adapter rather than a message fix. It fails
// safe (an unmatched error keeps the generic message), so the cost of drift is
// a vaguer sentence, never a wrong one.
function importFailureMessage(raw: string | null | undefined): string {
  const e = (raw ?? "").toLowerCase();
  if (!e) return msg("ERRORS.CARD_IMPORT_FETCH_FAILED");
  if (e.includes("timed out")) return msg("ERRORS.CARD_IMPORT_TIMED_OUT");
  if (e.includes("private") || e.includes("downloads disabled"))
    return msg("ERRORS.CARD_IMPORT_PRIVATE");
  // The upstream said the id is gone. Ours retries a transient rejection to its
  // deadline, so reaching the user means it stayed gone.
  if (e.includes("not_found") || e.includes("no longer exists"))
    return msg("ERRORS.CARD_IMPORT_NOT_FOUND");
  if (e.includes("no character id") || e.includes("no lorebook id"))
    return msg("ERRORS.CARD_IMPORT_INVALID_URL");
  if (e.includes("empty") || e.includes("no importable"))
    return msg("ERRORS.CARD_IMPORT_EMPTY");
  return msg("ERRORS.CARD_IMPORT_FETCH_FAILED");
}

// The route's own rejections are {error: <literal>}, but a 422 is Elysia's
// validation shape and carries no error field at all. A body we cannot read
// keeps the generic message rather than inventing one.
function rejected(body: object): Error {
  const code =
    "error" in body && typeof body.error === "string" ? body.error : "";
  return new Error(
    SUBMIT_ERRORS[code] ?? msg("ERRORS.CARD_IMPORT_FETCH_FAILED"),
  );
}

// Submit a link, wait for the job, hand the result to `persist`. Every entity
// shares this; only the persist step differs.
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
