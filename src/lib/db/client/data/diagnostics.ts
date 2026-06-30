import { getLocalDb } from "@/lib/db/client/client";
import {
  readLocalConversations,
  readLocalMessageMetaForConv,
} from "@/lib/db/client/data/chat";
import {
  readLocalRequestLogMetaForConv,
  readLocalRequestLogsForConv,
} from "@/lib/db/client/data/request-log";
import { getChatDebugLog, logChatDebug } from "@/lib/utils/chat-debug-log";
import { chatStore, convIdAtom, historyLoadedAtom } from "@/store/chat-store";
import { dayjs } from "@/lib/utils/format/date";

// One-file chat diagnostics for users to download + send. Safe mode = metadata only; full adds content.
export type DiagnosticsOptions = { includeContent: boolean };

export type TableStorageStat = {
  table: string;
  rows: number;
  bytes: number;
  size: string;
};

// Bytes -> human string with the largest fitting unit: "832 B", "12.4 KB", "57.1 MB".
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${Math.round(n * 10) / 10} ${units[i]}`;
}

// Per-table storage stats (record count + on-disk size) so a bloated table is provable - e.g. request_logs
// (full prompt snapshots) dominating a chat-heavy DB. Real bytes come from the `dbstat` virtual table (page
// sizes); each table's own indexes (named or `sqlite_autoindex_*`) fold into the owner table's bytes. Falls
// back to a row-count + big-JSON-column LENGTH() approximation if dbstat is unavailable on a build.
export async function getTableStorageStats(
  userId: number | undefined,
): Promise<TableStorageStat[] | { error: string }> {
  const local = await getLocalDb(userId);
  if (!local) return { error: "no local db" };

  try {
    const tablesRes = await local.exec(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
      [],
      "all",
    );
    const tables = tablesRes.rows.map((r) => String(r[0]));

    // dbstat: bytes per b-tree (table OR index). Fold index bytes into the table whose name they prefix.
    const statRes = await local.exec(
      `SELECT name, SUM(pgsize) AS bytes FROM dbstat GROUP BY name`,
      [],
      "all",
    );
    const bytesByName = new Map<string, number>();
    for (const row of statRes.rows) {
      bytesByName.set(String(row[0]), Number(row[1] ?? 0));
    }
    const bytesForTable = (table: string): number => {
      let total = bytesByName.get(table) ?? 0;
      for (const [name, b] of bytesByName) {
        if (name === table) continue;
        // An index belongs to `table` when its name is the autoindex prefix or starts with `idx_<table>`.
        if (
          name.startsWith(`sqlite_autoindex_${table}_`) ||
          name === `sqlite_autoindex_${table}` ||
          name.startsWith(`idx_${table}_`)
        ) {
          total += b;
        }
      }
      return total;
    };

    const stats: TableStorageStat[] = [];
    for (const table of tables) {
      const countRes = await local.exec(
        `SELECT count(*) FROM \`${table}\``,
        [],
        "all",
      );
      const rows = Number(countRes.rows[0]?.[0] ?? 0);
      const bytes = bytesForTable(table);
      stats.push({ table, rows, bytes, size: formatBytes(bytes) });
    }
    stats.sort((a, b) => b.bytes - a.bytes);
    const totalBytes = stats.reduce((acc, s) => acc + s.bytes, 0);
    const totalRows = stats.reduce((acc, s) => acc + s.rows, 0);
    const total: TableStorageStat = {
      table: "TOTAL",
      rows: totalRows,
      bytes: totalBytes,
      size: formatBytes(totalBytes),
    };
    return [total, ...stats];
  } catch {
    // dbstat unavailable: approximate from row counts + the heavy JSON columns.
    try {
      const tablesRes = await local.exec(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
        [],
        "all",
      );
      const heavyCol: Record<string, string> = {
        request_logs:
          "coalesce(length(final_messages),0)+coalesce(length(request_body),0)",
        message_items: "coalesce(length(data),0)",
        media: "coalesce(length(data_base64),0)",
      };
      const stats: TableStorageStat[] = [];
      for (const r of tablesRes.rows) {
        const table = String(r[0]);
        const sizeExpr = heavyCol[table] ?? "0";
        const res = await local.exec(
          `SELECT count(*), sum(${sizeExpr}) FROM \`${table}\``,
          [],
          "all",
        );
        const rows = Number(res.rows[0]?.[0] ?? 0);
        const bytes = Number(res.rows[0]?.[1] ?? 0);
        stats.push({ table, rows, bytes, size: formatBytes(bytes) });
      }
      stats.sort((a, b) => b.bytes - a.bytes);
      return stats;
    } catch (e2) {
      return { error: String(e2).slice(0, 200) };
    }
  }
}

export const MAX_LOG_CONVS = 25;

// The scalar diagnostics blocks (everything except the two big per-conv maps) plus the
// conversation list. The streaming encoder emits these whole, then streams the maps per-conv.
// Owns the storage-stats side effect (logChatDebug) so its ordering matches the old single object.
export async function buildDiagnosticsHead(
  userId: number | undefined,
  opts: DiagnosticsOptions,
) {
  const includeContent = opts.includeContent;

  const device = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    language: navigator.language,
    // iOS heuristic: classic iOS UA, or iPadOS masquerading as Mac with touch.
    likelyIos:
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    screen: { w: window.screen.width, h: window.screen.height },
    online: navigator.onLine,
  };

  const runtime = {
    url: location.href,
    convIdAtom: chatStore.get(convIdAtom),
    historyLoaded: chatStore.get(historyLoadedAtom),
  };

  let dbInfo: Record<string, unknown> = {};
  try {
    const local = await getLocalDb(userId);
    if (local) dbInfo = await local.getDatabaseInfo();
  } catch (e) {
    dbInfo = { error: String(e).slice(0, 200) };
  }
  try {
    const est = await navigator.storage?.estimate?.();
    if (est) dbInfo.storageEstimate = { usage: est.usage, quota: est.quota };
  } catch {}

  const convs = (await readLocalConversations(userId)) ?? [];
  const conversations = convs.map((c) => ({
    id: c.id,
    title: includeContent ? c.title : undefined,
    model: c.model,
    groupId: c.groupId,
    totalInputTokens: c.totalInputTokens,
    totalOutputTokens: c.totalOutputTokens,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  // Per-table storage stats, computed ON EXPORT only (not on every chat write). Appended to the debug log
  // so it rides along in `debugLog` too, then included as its own block.
  const tableStorage = await getTableStorageStats(userId);
  logChatDebug("storage-stats", { tableStorage });

  return {
    generatedAt: dayjs().toISOString(),
    tableStorage,
    includeContent,
    device,
    runtime,
    dbInfo,
    conversations,
    convIds: convs.map((c) => c.id),
    debugLog: getChatDebugLog(),
  };
}

// One conv's request-log rows for diagnostics: metadata-only in safe mode, blobs in full mode.
// Shared by buildDiagnostics and the streaming encoder so both modes stay byte-compatible.
export async function readRequestLogsForConvDiag(
  userId: number | undefined,
  convId: string,
  includeContent: boolean,
): Promise<unknown[]> {
  if (!includeContent)
    return readLocalRequestLogMetaForConv(userId, convId, MAX_LOG_CONVS);
  const logs = await readLocalRequestLogsForConv(userId, convId);
  return logs.slice(-MAX_LOG_CONVS).map((l) => ({
    msgId: l.msgId,
    convId: l.convId,
    requestId: l.requestId,
    channelName: l.channelName,
    inputTokens: l.inputTokens,
    createdAt: l.createdAt,
    // Full mode: the actual sent payload shows if a request carried the wrong conv's context.
    finalMessages: l.finalMessages,
    requestBody: l.requestBody,
  }));
}

export async function buildDiagnostics(
  userId: number | undefined,
  opts: DiagnosticsOptions,
): Promise<Record<string, unknown>> {
  const head = await buildDiagnosticsHead(userId, opts);

  // Per-conv message metadata: parentId/convId cross-links reveal a merge without exposing text.
  // SAFE/metadata mode NEVER loads the request_logs prompt snapshots (finalMessages/requestBody) -
  // those are the 50-100MB bloat and would OOM the export on a chat-heavy DB. The lean reader
  // projects only metadata columns in SQL. Full mode opts INTO the blobs (capped per conv).
  const messagesByConv: Record<string, unknown[]> = {};
  const requestLogsByConv: Record<string, unknown[]> = {};
  for (const id of head.convIds) {
    messagesByConv[id] = await readLocalMessageMetaForConv(userId, id);
    requestLogsByConv[id] = await readRequestLogsForConvDiag(
      userId,
      id,
      opts.includeContent,
    );
  }

  return {
    generatedAt: head.generatedAt,
    tableStorage: head.tableStorage,
    includeContent: head.includeContent,
    device: head.device,
    runtime: head.runtime,
    dbInfo: head.dbInfo,
    conversations: head.conversations,
    messagesByConv,
    requestLogsByConv,
    debugLog: head.debugLog,
  };
}
