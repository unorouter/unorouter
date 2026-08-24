import { buildDiagnostics } from "@/lib/db/client/data/diagnostics/diagnostics";
import { env } from "@/lib/config/env";
import { getLocalDb } from "@/lib/db/client/client";
import { newSql, terminateSql } from "@/lib/db/client/new-sql";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { downloadJson, streamFileToDisk } from "@/lib/utils/client";
import { logChatDebug } from "@/lib/utils/chat-debug-log";

export async function downloadDiagnostics(filename: string): Promise<void> {
  logChatDebug("export.diagnostics.start", { filename });
  try {
    const data = await buildDiagnostics();
    downloadJson(data, filename, { pretty: false });
    logChatDebug("export.diagnostics.done", { filename });
  } catch (e) {
    logChatDebug("export.diagnostics.error", { error: String(e) });
    // The localStorage-backed log needs no database, and a report from a user
    // whose database is dead is exactly the one worth having.
    try {
      const { getChatDebugLog } = await import("@/lib/utils/chat-debug-log");
      downloadJson(
        {
          generatedAt: new Date().toISOString(),
          partial: true,
          buildError: String(e).slice(0, 500),
          device: { userAgent: navigator.userAgent, url: location.href },
          debugLog: getChatDebugLog(),
        },
        filename,
        { pretty: false },
      );
      logChatDebug("export.diagnostics.partial", { filename });
      return;
    } catch (fallbackError) {
      logChatDebug("export.diagnostics.fallback_failed", {
        error: String(fallbackError).slice(0, 200),
      });
    }
    throw e;
  }
}

export type DbExportOptions = {
  includeChats?: boolean;
  includeRequestLogs?: boolean;
  includeMedia?: boolean;
};

function resolveOptions(opts?: DbExportOptions): Required<DbExportOptions> {
  return {
    includeChats: opts?.includeChats ?? true,
    includeRequestLogs: opts?.includeRequestLogs ?? false,
    includeMedia: opts?.includeMedia ?? true,
  };
}

// Cleared when includeChats is off. The reusable RP library (characters,
// personas, lorebooks, presets, cards, themes) is deliberately kept.
const CHAT_TABLES = [
  "conversations",
  "chat_groups",
  "messages",
  "message_items",
  "conversation_characters",
  "conversation_lorebooks",
  "request_logs",
] as const;

export async function downloadLocalDb(
  filename: string,
  options?: DbExportOptions,
): Promise<void> {
  const opts = resolveOptions(options);
  logChatDebug("export.db.start", { filename, options: opts });
  let built: { file: File; cleanup: () => Promise<void> } | null = null;
  try {
    built = await buildExportFile(opts);
    const path = await streamFileToDisk(built.file, filename);
    logChatDebug("export.db.done", {
      filename,
      bytes: built.file.size,
      path,
    });
  } catch (e) {
    logChatDebug("export.db.error", { error: String(e) });
    throw e;
  } finally {
    await built?.cleanup();
  }
}

// A shrunken COPY, so the live DB is never mutated.
async function buildExportFile(
  opts: Required<DbExportOptions>,
): Promise<{ file: File; cleanup: () => Promise<void> }> {
  const appName = env.appName.toLowerCase();
  const scratchPath = `${appName}-export.sqlite3`;

  const local = await getLocalDb();
  if (!local) throw new Error("SQLocal unavailable");
  const srcFile = await local.getDatabaseFile();
  logChatDebug("export.db.copy", { srcBytes: srcFile.size });

  const scratch = newSql(scratchPath);
  const cleanup = async () => {
    // Unlink THROUGH the driver: the scratch runs on the sahpool VFS, so its
    // bytes live in a pool slot, not under `scratchPath`. Removing that root
    // name deletes nothing and leaves a full copy of the database behind per
    // export (one report: 6.5MB of tables against 31.4MB of OPFS usage).
    // Terminate the worker too, or it holds the pool's access handles for the
    // life of the page.
    await scratch.deleteDatabaseFile().catch((err) =>
      logChatDebug("export.db.cleanup_failed", {
        stage: "delete",
        error: String(err).slice(0, 200),
      }),
    );
    await scratch.destroy().catch(() => {});
    terminateSql(scratch);
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(scratchPath).catch(() => {});
    } catch (err) {
      logChatDebug("export.db.cleanup_failed", {
        stage: "root",
        error: String(err).slice(0, 200),
      });
    }
  };
  try {
    // Stream, never arrayBuffer(): materializing the WHOLE database in memory
    // is what makes a large backup fail to save at all.
    await scratch.overwriteDatabaseFile(srcFile.stream());
    await scratch.sql`PRAGMA foreign_keys = OFF`;

    const before = await scratchSize(scratch);
    const deleted = await deleteExcluded(scratch, opts);
    // Provider API keys stay in this file: it is a LOCAL BACKUP restored on the
    // user's own device, while the artifact shared for debugging is the
    // diagnostics JSON, which never reads custom_providers. Stripping them here
    // silently breaks restores, everything back except a blank key.
    await scratch.sql`VACUUM`;
    const after = await scratchSize(scratch);
    logChatDebug("export.db.shrink", { before, after, deletedTables: deleted });

    const file = await scratch.getDatabaseFile();
    return { file, cleanup };
  } catch (e) {
    await cleanup();
    throw e;
  }
}

async function deleteExcluded(
  scratch: SQLocalDrizzle,
  opts: Required<DbExportOptions>,
): Promise<string[]> {
  const deleted: string[] = [];
  const drop = async (table: string, where?: string) => {
    await scratch.sql(
      `DELETE FROM \`${table}\`${where ? ` WHERE ${where}` : ""}`,
    );
    deleted.push(where ? `${table}(${where})` : table);
  };

  if (!opts.includeChats) {
    for (const table of CHAT_TABLES) await drop(table);
  }
  if (opts.includeChats && !opts.includeRequestLogs) {
    await drop("request_logs");
  }
  if (!opts.includeMedia) {
    await drop("media");
  } else if (!opts.includeChats) {
    await drop("media", "conv_id IS NOT NULL");
  }
  return deleted;
}

async function scratchSize(scratch: SQLocalDrizzle): Promise<number> {
  return (await scratch.getDatabaseInfo()).databaseSizeBytes ?? 0;
}
