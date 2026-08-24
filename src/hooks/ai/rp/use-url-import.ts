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
      throw new Error(state.error || msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
    }
    if (state.status !== "done" || !state.result) continue;
    return persist(state.result);
  }
}
