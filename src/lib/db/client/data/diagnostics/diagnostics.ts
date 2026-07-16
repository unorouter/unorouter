import { getLocalDb } from "@/lib/db/client/client";
import {
  readLocalConversations,
  readLocalMessageMetaForConv,
} from "@/lib/db/client/data/chat/chat";
import {
  readLocalRequestLogMetaForConv,
  readLocalRequestLogsForConv,
  readLocalRequestLogsNewestForConv,
} from "@/lib/db/client/data/chat/request-log";
import { getChatDebugLog, logChatDebug } from "@/lib/utils/chat-debug-log";
import {
  chatStore,
  convIdAtom,
  historyLoadedAtom,
  localUserIdAtom,
} from "@/store/chat-store";
import { dayjs } from "@/lib/utils/format/date";

export type DiagnosticsOptions = { includeContent: boolean };

export type TableStorageStat = {
  table: string;
  rows: number;
  bytes: number;
  size: string;
};

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
    likelyIos:
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    screen: { w: window.screen.width, h: window.screen.height },
    online: navigator.onLine,
    standalone:
      window.matchMedia?.("(display-mode: standalone)")?.matches ?? false,
  };

  const runtime = {
    url: location.href,
    convIdAtom: chatStore.get(convIdAtom),
    historyLoaded: chatStore.get(historyLoadedAtom),
    localUserId: chatStore.get(localUserIdAtom),
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
  } catch (e) {
    logChatDebug("diagnostics.storage_estimate_failed", {
      error: String(e).slice(0, 200),
    });
  }

  const convs = (await readLocalConversations(userId)) ?? [];
  const settingsById = new Map<string, Record<string, unknown>>();
  try {
    const local = await getLocalDb(userId);
    if (local) {
      const res = await local.exec(
        `SELECT id, preset_id, chat_memory, memory_enabled, summary_anchor, utility_model FROM conversations`,
        [],
        "all",
      );
      for (const r of res.rows) {
        settingsById.set(String(r[0]), {
          presetId: r[1],
          chatMemory: r[2],
          memoryEnabled: r[3],
          summaryAnchor: r[4],
          utilityModel: r[5],
        });
      }
    }
  } catch {}
  const conversations = convs.map((c) => ({
    id: c.id,
    title: includeContent ? c.title : undefined,
    model: c.model,
    groupId: c.groupId,
    totalInputTokens: c.totalInputTokens,
    totalOutputTokens: c.totalOutputTokens,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    ...(settingsById.get(c.id) ?? {}),
  }));

  let presets: unknown[] = [];
  try {
    const { readLocalPresets } = await import("@/lib/db/client/data/rp/rp");
    presets = ((await readLocalPresets(userId)) ?? []).map((p) => ({
      id: p.id,
      name: includeContent ? p.name : undefined,
      chatMemory: p.chatMemory,
      memoryEnabled: p.memoryEnabled,
      forceAlternateRoles: p.forceAlternateRoles,
      noSystemRole: p.noSystemRole,
      mustStartWithUserInput: p.mustStartWithUserInput,
      postHistoryRole: p.postHistoryRole,
      hasPromptTemplate: !!p.promptTemplate,
      promptTemplate: includeContent ? p.promptTemplate : undefined,
      isDefault: p.isDefault,
    }));
  } catch (e) {
    presets = [{ error: String(e).slice(0, 200) }];
  }

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
    presets,
    convIds: convs.map((c) => c.id),
    debugLog: getChatDebugLog(),
  };
}

function messageShape(finalMessages: unknown): unknown {
  if (!Array.isArray(finalMessages)) return null;
  return finalMessages.map((m) => {
    const msg = m as {
      role?: string;
      parts?: { type?: string; text?: string }[];
    };
    return {
      role: msg.role,
      parts: Array.isArray(msg.parts)
        ? msg.parts.map((p) => ({
            type: p.type,
            chars: typeof p.text === "string" ? p.text.length : undefined,
          }))
        : undefined,
    };
  });
}

const MAX_SHAPE_ROWS = 3;

export async function readRequestLogsForConvDiag(
  userId: number | undefined,
  convId: string,
  includeContent: boolean,
): Promise<unknown[]> {
  if (!includeContent) {
    const meta = await readLocalRequestLogMetaForConv(
      userId,
      convId,
      MAX_LOG_CONVS,
    );
    const newest = await readLocalRequestLogsNewestForConv(
      userId,
      convId,
      MAX_SHAPE_ROWS,
    );
    return meta.map((row) => {
      const match = newest.find((l) => l.msgId === row.msgId);
      return match
        ? { ...row, finalShape: messageShape(match.finalMessages) }
        : row;
    });
  }
  const logs = await readLocalRequestLogsForConv(userId, convId);
  return logs.slice(-MAX_LOG_CONVS).map((l) => ({
    msgId: l.msgId,
    convId: l.convId,
    requestId: l.requestId,
    channelName: l.channelName,
    inputTokens: l.inputTokens,
    createdAt: l.createdAt,
    finalMessages: l.finalMessages,
    requestBody: l.requestBody,
  }));
}

export async function buildDiagnostics(
  userId: number | undefined,
  opts: DiagnosticsOptions,
): Promise<Record<string, unknown>> {
  const head = await buildDiagnosticsHead(userId, opts);

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
    presets: head.presets,
    messagesByConv,
    requestLogsByConv,
    debugLog: head.debugLog,
  };
}
