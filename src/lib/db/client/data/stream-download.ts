import { GUEST_USER_ID } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { getLocalDb, resetLocalDbCache } from "@/lib/db/client/client";
import { buildDiagnostics } from "@/lib/db/client/data/diagnostics";
import { diagnosticsChunks } from "@/lib/db/client/data/json-stream-encoder";
import type { DiagnosticsOptions } from "@/lib/db/client/data/diagnostics";
import { downloadBlob, downloadJson } from "@/lib/utils/client";
import { logger } from "@/lib/utils/logger";
import {
  streamDownloadViaSw,
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
      await streamDownloadViaSw({
        filename,
        contentType: "application/json",
        source: diagnosticsChunks(userId, opts),
      });
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

// Stream the OPFS SQLite file through the SW. SQLocal holds an exclusive handle, so try a direct
// read first; on a lock error release SQLocal (same release wipe/upload use) and retry, reloading
// after since the live DB was torn down. Fall back to SQLocal's own export blob when no SW.
export async function downloadLocalDbStreaming(
  userId: number | undefined,
  filename: string,
): Promise<void> {
  if (swDownloadSupported()) {
    try {
      const opened = await openOpfsDbFile(userId);
      await streamDownloadViaSw({
        filename,
        contentType: "application/octet-stream",
        contentLength: opened.file.size,
        source: fileChunks(opened.file),
      });
      // Released the live DB to read it: reload so SQLocal reopens cleanly once the stream started.
      if (opened.released) setTimeout(() => location.reload(), 1500);
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

type OpenedDbFile = { file: File; released: boolean };

// Read the OPFS DB file directly. getFile() may throw while SQLocal holds the SyncAccessHandle;
// on that, release SQLocal and retry (caller reloads after).
async function openOpfsDbFile(
  userId: number | undefined,
): Promise<OpenedDbFile> {
  const dbPath = `${env.appName.toLowerCase()}-${userId ?? GUEST_USER_ID}.sqlite3`;
  const root = await navigator.storage.getDirectory();

  try {
    const handle = await root.getFileHandle(dbPath);
    const file = await handle.getFile();
    return { file, released: false };
  } catch (e) {
    if (!isHandleConflict(e)) throw e;
  }

  // Lock conflict: release SQLocal's handle (same path wipe()/upload() use), then retry the read.
  const local = await getLocalDb(userId);
  if (local) await local.destroy().catch(() => {});
  resetLocalDbCache();
  await sleep(150);
  const handle = await root.getFileHandle(dbPath);
  const file = await handle.getFile();
  return { file, released: true };
}

function isHandleConflict(e: unknown): boolean {
  const s = String(e);
  return (
    s.includes("NoModificationAllowedError") ||
    s.includes("InvalidStateError") ||
    s.includes("NotReadableError")
  );
}

async function* fileChunks(file: File): AsyncGenerator<Uint8Array> {
  const reader = file.stream().getReader();
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    yield next.value;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
