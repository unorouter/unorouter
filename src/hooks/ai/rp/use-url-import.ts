"use client";

import {
  getApiJobsById,
  postApiJobs,
  type GetApiJobsById200,
} from "@/lib/api/uno-import";
import { msg } from "@/lib/config/constants";

const POLL_MS = 1500;
// Must outlast the worker's own deadline. At 3 minutes this gave up while the
// job was still rolling exits and later succeeded, so a card that WOULD have
// imported was reported as a failure to the user.
const POLL_TIMEOUT_MS = 16 * 60_000;

// Still generated, not hand-written: the arms come from uno-import's OpenAPI
// doc. Only the ARITY is repaired here. A job returns a list (one URL can hold
// many characters), but fromTypes distributes an array across a union, so the
// emitted schema reads "one of the six variants, or an array of the last one".
// Flattening the array arm back out recovers the element type without
// restating any variant, so a change upstream still flows through.
type GeneratedResult = NonNullable<GetApiJobsById200["result"]>;
export type ImportedResult =
  GeneratedResult extends readonly (infer E)[]
    ? E
    : GeneratedResult extends infer U
      ? U extends readonly (infer E2)[]
        ? E2
        : U
      : never;

const SUBMIT_ERRORS: Record<string, string> = {
  "unsupported source": msg("ERRORS.CARD_IMPORT_UNSUPPORTED"),
  "too many jobs in flight": msg("ERRORS.CARD_IMPORT_TOO_MANY"),
  "invalid url": msg("ERRORS.CARD_IMPORT_INVALID_URL"),
  "https only": msg("ERRORS.CARD_IMPORT_INVALID_URL"),
  "not found": msg("ERRORS.CARD_IMPORT_JOB_GONE"),
};

// Job errors are prose log strings ("datacat: not_found (at <url>)"), not codes,
// so substring matching is the only option.
function importFailureMessage(raw: string | null | undefined): string {
  const e = (raw ?? "").toLowerCase();
  if (!e) return msg("ERRORS.CARD_IMPORT_FETCH_FAILED");
  // The worker gave up early because other callers were queued behind it, so the
  // upstream error it carries is incidental: reporting that would send the user
  // looking for a missing card when the answer is simply to try again.
  if (e.startsWith("busy:")) return msg("ERRORS.CARD_IMPORT_BUSY");
  if (e.includes("timed out")) return msg("ERRORS.CARD_IMPORT_TIMED_OUT");
  if (e.includes("private") || e.includes("downloads disabled"))
    return msg("ERRORS.CARD_IMPORT_PRIVATE");
  // JanitorAI characters are fetched through datacat's crawl, so a card that
  // exists on the site is still unavailable to us until datacat has indexed it.
  // That is a different thing from a deleted card and needs its own wording.
  if (e.includes("character not indexed"))
    return msg("ERRORS.CARD_IMPORT_NOT_INDEXED");
  if (e.includes("not_found") || e.includes("no longer exists"))
    return msg("ERRORS.CARD_IMPORT_NOT_FOUND");
  if (e.includes("no character id") || e.includes("no lorebook id"))
    return msg("ERRORS.CARD_IMPORT_INVALID_URL");
  if (e.includes("empty") || e.includes("no importable"))
    return msg("ERRORS.CARD_IMPORT_EMPTY");
  return msg("ERRORS.CARD_IMPORT_FETCH_FAILED");
}

// Route rejections are {error: <literal>}; a 422 is Elysia's validation shape
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
  persist: (results: ImportedResult[]) => Promise<T>,
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
    // Older workers answered with one object; normalise so a hook never has to
    // care which it is talking to.
    const list = (
      Array.isArray(state.result) ? state.result : [state.result]
    ) as ImportedResult[];
    if (list.length === 0) {
      throw new Error(msg("ERRORS.CARD_IMPORT_EMPTY"));
    }
    return persist(list);
  }
}
