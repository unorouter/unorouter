import { GUEST_USER_ID } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { getLocalDb, resetLocalDbCache } from "@/lib/db/client/client";
import { buildDiagnostics } from "@/lib/db/client/data/diagnostics";
import { diagnosticsChunks } from "@/lib/db/client/data/json-stream-encoder";
import type { DiagnosticsOptions } from "@/lib/db/client/data/diagnostics";
import { downloadBlob, downloadJson } from "@/lib/utils/client";
import { logger } from "@/lib/utils/logger";
import {
  downloadJsonViaSw,
  downloadOpfsFileViaSw,
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

// Stream the OPFS SQLite file. The SW reads OPFS itself, but SQLocal holds an exclusive handle, so
// release it first (same release wipe/upload use) then navigate, then reload since the live DB was
// torn down. Fall back to SQLocal's own export blob when no SW controls the page.
export async function downloadLocalDbStreaming(
  userId: number | undefined,
  filename: string,
): Promise<void> {
  const dbFileName = `${env.appName.toLowerCase()}-${userId ?? GUEST_USER_ID}.sqlite3`;

  if (swDownloadSupported()) {
    try {
      // Release SQLocal's SyncAccessHandle so the SW's getFile() can read the file. Don't reload:
      // resetLocalDbCache lets the next DB access reopen lazily, and a reload could interrupt the
      // iOS download mid-flight. The brief sleep lets the released handle settle before the SW reads.
      const local = await getLocalDb(userId);
      if (local) await local.destroy().catch(() => {});
      resetLocalDbCache();
      await sleep(250);
      downloadOpfsFileViaSw(dbFileName, filename);
      return;
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
