import { buildDiagnostics } from "@/lib/db/client/data/diagnostics/diagnostics";
import { getLocalDb } from "@/lib/db/client/client";
import type { LocalClient } from "@/lib/types";
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

// Cleared when includeChats is off; the reusable RP library is kept.
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

// A shrunken COPY, built and shrunk INSIDE the live worker's pool: VACUUM INTO
// a temp pool file, ATTACH it, delete what the options exclude, VACUUM it, then
// export that one file. The previous shape read the whole database into the
// main thread, streamed it into a second worker, and read it back out again:
// four full copies plus a second WASM heap, which on an iPhone was the memory
// pressure that later killed tabs (#33076). The live database is never mutated.
async function buildExportFile(
  opts: Required<DbExportOptions>,
): Promise<{ file: File; cleanup: () => Promise<void> }> {
  const local = await getLocalDb();
  if (!local) throw new Error("SQLocal unavailable");
  const info = await local.getDatabaseInfo();
  const dbName = (info.databasePath ?? "unorouter.sqlite").replace(/^\/+/, "");
  // Same shape purgeOrphans() recognises, so a crash mid-export leaves
  // nothing a later open cannot clean up.
  const tempName = `/backup-${Date.now()}--${dbName}`;
  logChatDebug("export.db.copy", { srcBytes: info.databaseSizeBytes ?? 0 });

  const cleanup = async () => {
    await local.unlinkPoolFile(tempName).catch((err) =>
      logChatDebug("export.db.cleanup_failed", {
        stage: "unlink",
        error: String(err).slice(0, 200),
      }),
    );
  };
  await local.exec("VACUUM INTO ?", [tempName], "run");
  try {
    await local.exec("ATTACH DATABASE ? AS exp", [tempName], "run");
    let before = 0;
    let after = 0;
    let deleted: string[] = [];
    try {
      before = await attachedSize(local);
      deleted = await deleteExcluded(local, opts);
      await local.exec("VACUUM exp", [], "run");
      after = await attachedSize(local);
    } finally {
      await local.exec("DETACH DATABASE exp", [], "run");
    }
    logChatDebug("export.db.shrink", { before, after, deletedTables: deleted });
    const file = await local.exportPoolFile(tempName, dbName);
    return { file, cleanup };
  } catch (e) {
    await cleanup();
    throw e;
  }
}

async function deleteExcluded(
  local: LocalClient,
  opts: Required<DbExportOptions>,
): Promise<string[]> {
  const deleted: string[] = [];
  const drop = async (table: string, where?: string) => {
    await local.exec(
      `DELETE FROM exp.\`${table}\`${where ? ` WHERE ${where}` : ""}`,
      [],
      "run",
    );
    deleted.push(where ? `${table}(${where})` : table);
  };

  // Deletes run child tables last on purpose, so foreign keys stay on: the
  // live connection shares this pragma with every other query in flight.
  // The tokenizer rows are a download cache, rebuilt on demand; on one phone
  // they were 38MB of a 62MB backup.
  await drop("tokenizers");
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

async function attachedSize(local: LocalClient): Promise<number> {
  const scalar = async (sql: string) => {
    const res = await local.exec(sql, [], "all");
    const v = res.rows[0]?.[0];
    return typeof v === "number" ? v : 0;
  };
  return (
    (await scalar("PRAGMA exp.page_count")) *
    (await scalar("PRAGMA exp.page_size"))
  );
}
