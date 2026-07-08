import { buildDiagnostics } from "@/lib/db/client/data/diagnostics/diagnostics";
import { clearAllRequestLogs } from "@/lib/db/client/data/chat/request-log";
import { getLocalDb } from "@/lib/db/client/client";
import type { DiagnosticsOptions } from "@/lib/db/client/data/diagnostics/diagnostics";
import { downloadBlob, downloadJson } from "@/lib/utils/client";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { logger } from "@/lib/utils/logger";

export async function downloadDiagnostics(
  userId: number | undefined,
  filename: string,
  opts: DiagnosticsOptions,
): Promise<void> {
  logChatDebug("export.diagnostics.start", {
    filename,
    includeContent: opts.includeContent,
  });
  try {
    const data = await buildDiagnostics(userId, opts);
    downloadJson(data, filename, { pretty: false });
    logChatDebug("export.diagnostics.done", { filename });
  } catch (e) {
    logChatDebug("export.diagnostics.error", { error: String(e) });
    throw e;
  }
}

export async function downloadLocalDb(
  userId: number | undefined,
  filename: string,
): Promise<void> {
  logChatDebug("export.db.start", { filename });
  try {
    await shrinkBeforeExport(userId);
    const local = await getLocalDb(userId);
    if (!local) throw new Error("SQLocal unavailable");
    const file = await local.getDatabaseFile();
    logChatDebug("export.db.read", { bytes: file.size });
    downloadBlob(file, filename);
    logChatDebug("export.db.done", { filename, bytes: file.size });
  } catch (e) {
    logChatDebug("export.db.error", { error: String(e) });
    throw e;
  }
}

async function shrinkBeforeExport(userId: number | undefined): Promise<void> {
  try {
    const local = await getLocalDb(userId);
    if (!local) return;
    const before = (await local.getDatabaseInfo()).databaseSizeBytes;
    await clearAllRequestLogs(userId);
    await local.exec("VACUUM", [], "run");
    const after = (await local.getDatabaseInfo()).databaseSizeBytes;
    logChatDebug("export.db.shrink", { before, after });
  } catch (e) {
    logChatDebug("export.db.shrink_error", { error: String(e) });
    logger.warn("pre-export shrink skipped", {
      context: "db-export",
      error: String(e),
    });
  }
}
