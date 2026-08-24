"use client";

import type { GetApiJobsById200 } from "@/lib/api/uno-import";
import { msg } from "@/lib/config/constants";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";

// A fetch runs a real browser and may rotate its VPN exit mid-job, so the server
// hands back a job id and the client polls. Holding the request open instead
// turns a slow import into a browser timeout with nothing to report.
//
// The server retries to its own deadline, so this one only has to outlast a
// normal fetch plus a few exit rotations.
const POLL_MS = 1500;
const POLL_TIMEOUT_MS = 180_000;

// Generated from uno-import's own OpenAPI document, so a new result kind is a
// compile error here rather than a shape the client silently ignores. Do not
// hand-write a mirror of it.
export type ImportedResult = NonNullable<GetApiJobsById200["result"]>;

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

// Submit a link, wait for the job, hand the result to `persist`. Every entity
// shares this; only the persist step differs.
export async function runUrlImport<T>(
  url: string,
  persist: (result: ImportedResult) => Promise<T>,
): Promise<T> {
  const job = handleElysia(
    await rpc.api.ai["character-cards"].import.post({ url }),
  );

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
    const state = handleElysia(
      await rpc.api.ai["character-cards"].import({ jobId: job.jobId }).get(),
    );
    if (state.status === "failed") {
      throw new Error(importFailureMessage(state.error));
    }
    if (state.status !== "done" || !state.result) continue;
    return persist(state.result);
  }
}
