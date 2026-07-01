import { buildDiagnostics } from "@/lib/db/client/data/diagnostics";
import { clearAllRequestLogs } from "@/lib/db/client/data/request-log";
import { getLocalDb } from "@/lib/db/client/client";
import type { DiagnosticsOptions } from "@/lib/db/client/data/diagnostics";
import { downloadBlob, downloadJson } from "@/lib/utils/client";
import { logger } from "@/lib/utils/logger";

// Downloads are plain blobs. The service-worker "streamed download" path was removed: iOS Safari
// bypasses service-worker control for navigation-triggered downloads (the iframe hit the server and
// "downloaded" the 404 HTML page - the mystery 6KB file). StreamSaver.js itself falls back to a blob
// on WebKit for the same reason. We instead keep the payload SMALL (metadata-only diagnostics; the DB
// is shrunk by wiping request_logs + VACUUM before export) so a plain blob fits in memory on iOS.

export async function downloadDiagnostics(
  userId: number | undefined,
  filename: string,
  opts: DiagnosticsOptions,
): Promise<void> {
  const data = await buildDiagnostics(userId, opts);
  downloadJson(data, filename, { pretty: false });
}

export async function downloadLocalDb(
  userId: number | undefined,
  filename: string,
): Promise<void> {
  // Clean slate: wipe the heaviest table (full per-turn prompt snapshots - the 400MB+ bloat) and
  // VACUUM so the file actually shrinks before we read it, keeping the blob small enough for iOS.
  await shrinkBeforeExport(userId);
  const local = await getLocalDb(userId);
  if (!local) throw new Error("SQLocal unavailable");
  const file = await local.getDatabaseFile();
  downloadBlob(file, filename);
}

async function shrinkBeforeExport(userId: number | undefined): Promise<void> {
  try {
    const local = await getLocalDb(userId);
    if (!local) return;
    await clearAllRequestLogs(userId);
    await local.exec("VACUUM", [], "run");
  } catch (e) {
    logger.warn("pre-export shrink skipped", {
      context: "db-export",
      error: String(e),
    });
  }
}
