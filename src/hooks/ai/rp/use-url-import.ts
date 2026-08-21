"use client";

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

export type ImportedResult = {
  kind?: "character" | "lorebook" | "persona" | "rich-character";
  source: string;
  sourceUrl: string;
  card?: { spec?: string; data?: Record<string, unknown> };
  lorebooks?: Array<{
    name: string;
    scanDepth?: number;
    entries: Array<Record<string, unknown>>;
  }>;
  personas?: Array<{
    name: string;
    description: string;
    attributes?: Record<string, string>;
  }>;
  skipped?: Array<{ title: string; reason: "private" | "not_found" }>;
  regexScripts?: unknown;
  triggers?: unknown;
  assets?: Array<{ name: string; mimeType: string; base64: string }>;
};

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
    return persist(state.result as ImportedResult);
  }
}
