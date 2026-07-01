import { GUEST_USER_ID } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { getLocalDb, resetLocalDbCache } from "@/lib/db/client/client";
import { buildDiagnostics } from "@/lib/db/client/data/diagnostics";
import { diagnosticsChunks } from "@/lib/db/client/data/json-stream-encoder";
import { clearAllRequestLogs } from "@/lib/db/client/data/request-log";
import type { DiagnosticsOptions } from "@/lib/db/client/data/diagnostics";
import { downloadBlob, downloadJson } from "@/lib/utils/client";
import { logger } from "@/lib/utils/logger";
import {
  downloadJsonViaSw,
  downloadOpfsFileViaSw,
  probeOpfsReadable,
  swDownloadSupported,
} from "@/lib/utils/sw-download";

// Stream the diagnostics JSON through the SW (flat memory); fall back to the in-memory blob path
// when no SW controls the page (dev / unsupported) or anything in the stream path throws.
export async function downloadDiagnosticsStreaming(
  userId: number | undefined,
  filename: string,
  opts: DiagnosticsOptions,
): Promise<void> {
  if (swDownloadSupported()) {
    try {
      await downloadJsonViaSw(filename, diagnosticsChunks(userId, opts));
      return;
    } catch (e) {
      logger.warn("Diagnostics SW download failed; falling back to blob", {
        context: "stream-download",
        error: String(e),
      });
    }
  }
  const data = await buildDiagnostics(userId, opts);
  downloadJson(data, filename, { pretty: false });
}

// Stream the OPFS SQLite file. The SW reads OPFS itself. PROBE FIRST (proves the SW intercepts and
// whether the file is readable) BEFORE tearing anything down - so an old/uncontrolled build falls
// back to the blob path with the live DB fully intact, instead of destroying SQLocal and then
// "downloading" a 404 HTML page. Only release SQLocal's handle if the probe says the file is locked.
export async function downloadLocalDbStreaming(
  userId: number | undefined,
  filename: string,
): Promise<void> {
  const dbFileName = `${env.appName.toLowerCase()}-${userId ?? GUEST_USER_ID}.sqlite3`;

  // Clean slate before backup: wipe the heaviest table (full per-turn prompt snapshots, the 400MB+
  // bloat) and VACUUM so the file actually shrinks on disk before the SW/blob reads it.
  await shrinkBeforeExport(userId);

  if (swDownloadSupported()) {
    try {
      let state = await probeOpfsReadable(dbFileName);
      if (state === "locked") {
        // Release SQLocal's SyncAccessHandle so the SW's getFile() can read the file. No reload:
        // resetLocalDbCache lets the next DB access reopen lazily, and a reload could interrupt the
        // iOS download mid-flight. The brief sleep lets the released handle settle before re-probe.
        const local = await getLocalDb(userId);
        if (local) await local.destroy().catch(() => {});
        resetLocalDbCache();
        await new Promise((r) => setTimeout(r, 250));
        state = await probeOpfsReadable(dbFileName);
      }
      if (state === "ok") {
        downloadOpfsFileViaSw(dbFileName, filename);
        return;
      }
      throw new Error(`db still not readable after release: ${state}`);
    } catch (e) {
      logger.warn("DB SW download failed; falling back to blob", {
        context: "stream-download",
        error: String(e),
      });
    }
  }
  const local = await getLocalDb(userId);
  if (!local) throw new Error("SQLocal unavailable");
  const file = await local.getDatabaseFile();
  downloadBlob(file, filename);
}

// Wipe request_logs + VACUUM so the exported file drops the per-turn prompt-snapshot bloat and the
// file actually shrinks (a bare DELETE leaves the pages allocated). Best-effort; never blocks export.
async function shrinkBeforeExport(userId: number | undefined): Promise<void> {
  try {
    const local = await getLocalDb(userId);
    if (!local) return;
    await clearAllRequestLogs(userId);
    await local.exec("VACUUM", [], "run");
  } catch (e) {
    logger.warn("pre-export shrink skipped", {
      context: "stream-download",
      error: String(e),
    });
  }
}
