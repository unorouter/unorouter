import { getLocalDb } from "@/lib/db/client/client";
import {
  readLocalConversations,
  readLocalMessages,
} from "@/lib/db/client/data/chat";
import { readLocalRequestLogsForConv } from "@/lib/db/client/data/request-log";
import {
  getChatDebugLog,
  logChatDebug,
} from "@/lib/utils/chat-debug-log";
import { chatStore, convIdAtom, historyLoadedAtom } from "@/store/chat-store";
import { dayjs } from "@/lib/utils/format/date";

// One-file chat diagnostics for users to download + send. Safe mode = metadata only; full adds content.
type DiagnosticsOptions = { includeContent: boolean };

export type TableStorageStat = {
  table: string;
  rows: number;
  bytes: number;
  kb: number;
  mb: number;
};

// Per-table storage stats (record count + on-disk size) so a bloated table is provable - e.g. request_logs
// (full prompt snapshots) dominating a chat-heavy DB. Real bytes come from the `dbstat` virtual table (page
// sizes); each table's own indexes (named or `sqlite_autoindex_*`) fold into the owner table's bytes. Falls
// back to a row-count + big-JSON-column LENGTH() approximation if dbstat is unavailable on a build.
export async function getTableStorageStats(
  userId: number | undefined,
): Promise<TableStorageStat[] | { error: string }> {
  const local = await getLocalDb(userId);
  if (!local) return { error: "no local db" };
  const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

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
      stats.push({
        table,
        rows,
        bytes,
        kb: round(bytes / 1024),
        mb: round(bytes / 1024 / 1024),
      });
    }
    stats.sort((a, b) => b.bytes - a.bytes);
    const total = stats.reduce(
      (acc, s) => ({
        table: "TOTAL",
        rows: acc.rows + s.rows,
        bytes: acc.bytes + s.bytes,
        kb: 0,
        mb: 0,
      }),
      { table: "TOTAL", rows: 0, bytes: 0, kb: 0, mb: 0 } as TableStorageStat,
    );
    total.kb = round(total.bytes / 1024);
    total.mb = round(total.bytes / 1024 / 1024);
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
        request_logs: "coalesce(length(final_messages),0)+coalesce(length(request_body),0)",
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
        stats.push({
          table,
          rows,
          bytes,
          kb: round(bytes / 1024),
          mb: round(bytes / 1024 / 1024),
        });
      }
      stats.sort((a, b) => b.bytes - a.bytes);
      return stats;
    } catch (e2) {
      return { error: String(e2).slice(0, 200) };
    }
  }
}

const MAX_LOG_CONVS = 25;

export async function buildDiagnostics(
  userId: number | undefined,
  opts: DiagnosticsOptions,
): Promise<Record<string, unknown>> {
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

  // Per-conv message metadata: parentId/convId cross-links reveal a merge without exposing text.
  const messagesByConv: Record<string, unknown[]> = {};
  const requestLogsByConv: Record<string, unknown[]> = {};
  for (const c of convs) {
    const rows = (await readLocalMessages(userId, c.id)) ?? [];
    messagesByConv[c.id] = rows.map((m) => ({
      id: m.id,
      convId: m.convId,
      parentId: m.parentId,
      role: m.role,
      model: m.model,
      branchIndex: m.branchIndex,
      isActiveBranch: m.isActiveBranch,
      createdAt: m.createdAt,
    }));

    const logs = await readLocalRequestLogsForConv(userId, c.id);
    requestLogsByConv[c.id] = logs.slice(-MAX_LOG_CONVS).map((l) => ({
      msgId: l.msgId,
      convId: l.convId,
      requestId: l.requestId,
      channelName: l.channelName,
      inputTokens: l.inputTokens,
      createdAt: l.createdAt,
      // Full mode: the actual sent payload shows if a request carried the wrong conv's context.
      finalMessages: includeContent ? l.finalMessages : undefined,
      requestBody: includeContent ? l.requestBody : undefined,
    }));
  }

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
    messagesByConv,
    requestLogsByConv,
    debugLog: getChatDebugLog(),
  };
}
