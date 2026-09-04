import { getLocalDb } from "@/lib/db/client/client";
import { rec, recArr } from "@/lib/utils/base";
import { isIOS, isStandalone } from "@/lib/notify/push";
import {
  readLocalConversations,
  readLocalMessageMetaForConv,
} from "@/lib/db/client/data/chat/chat";
import {
  readLocalRequestLogMetaForConv,
  readLocalRequestLogsNewestForConv,
} from "@/lib/db/client/data/chat/request-log";
import { activeTokenizerState } from "@/lib/ai/chat/tokenizer";
import { readLocalJsPlugins } from "@/lib/db/client/data/rp/js-plugins";
import {
  getCaughtErrors,
  getChatDebugLog,
  getFailedRequestCaptures,
  logChatDebug,
} from "@/lib/utils/chat-debug-log";
import { chatStore, convIdAtom, historyLoadedAtom } from "@/store/chat-store";
import { dayjs } from "@/lib/utils/format/date";
import { RELEASE } from "@/lib/utils/client-runtime-guards";

export type TableStorageStat = {
  table: string;
  rows: number;
  bytes: number;
  size: string;
  // dbstat reports table totals only, never per-column.
  columnBytes?: Record<string, number>;
};

const HEAVY_COLUMNS: Record<string, string[]> = {
  request_logs: ["final_messages", "request_body", "assembled_system"],
  message_items: ["data"],
  media: ["data_base64"],
  image_snapshots: ["params", "extra_params", "references"],
  messages: ["branch_vars"],
  conversations: ["vars", "summary_memory"],
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

async function getTableStorageStats(): Promise<
  TableStorageStat[] | { error: string }
> {
  const local = await getLocalDb();
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
      const cols = HEAVY_COLUMNS[table];
      let columnBytes: Record<string, number> | undefined;
      if (cols && rows > 0) {
        try {
          const sums = await local.exec(
            `SELECT ${cols
              .map((c) => `coalesce(sum(length(\`${c}\`)),0)`)
              .join(", ")} FROM \`${table}\``,
            [],
            "all",
          );
          const row = sums.rows[0] ?? [];
          columnBytes = {};
          cols.forEach((c, i) => {
            columnBytes![c] = Number(row[i] ?? 0);
          });
        } catch {
          // A renamed/dropped column must not break the whole report.
        }
      }
      stats.push({
        table,
        rows,
        bytes,
        size: formatBytes(bytes),
        ...(columnBytes ? { columnBytes } : {}),
      });
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

const MAX_LOGS_PER_CONV = 25;

// Which worker controls the page and whether an update is mid-flight: a
// navigation killed by a worker update leaves no log, so this is the only
// direct evidence of the install that did it.
async function serviceWorkerState() {
  const sw = navigator.serviceWorker;
  if (!sw) return { supported: false };
  try {
    const reg = await sw.getRegistration();
    const cacheNames = "caches" in window ? await caches.keys() : [];
    return {
      supported: true,
      controlled: !!sw.controller,
      active: reg?.active?.state ?? null,
      waiting: reg?.waiting?.state ?? null,
      installing: reg?.installing?.state ?? null,
      cacheNames,
    };
  } catch (e) {
    return { supported: true, error: String(e).slice(0, 200) };
  }
}

async function buildDiagnosticsHead() {
  const device = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    language: navigator.language,
    likelyIos: isIOS(),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    screen: { w: window.screen.width, h: window.screen.height },
    online: navigator.onLine,
    standalone: isStandalone(),
  };

  const runtime = {
    url: location.href,
    release: RELEASE,
    convIdAtom: chatStore.get(convIdAtom),
    historyLoaded: chatStore.get(historyLoadedAtom),
    sw: await serviceWorkerState(),
  };

  let dbInfo: Record<string, unknown> = {};
  try {
    const local = await getLocalDb();
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

  // Every read past here is best-effort: the export must still be produceable
  // on the DB-unavailable path, which is exactly when it is needed.
  let convs: Awaited<ReturnType<typeof readLocalConversations>> = [];
  try {
    convs = (await readLocalConversations()) ?? [];
  } catch (e) {
    dbInfo.conversationsError = String(e).slice(0, 200);
  }
  const settingsById = new Map<string, Record<string, unknown>>();
  try {
    const local = await getLocalDb();
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
    title: c.title,
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
    presets = ((await readLocalPresets()) ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      chatMemory: p.chatMemory,
      memoryEnabled: p.memoryEnabled,
      forceAlternateRoles: p.forceAlternateRoles,
      noSystemRole: p.noSystemRole,
      mustStartWithUserInput: p.mustStartWithUserInput,
      postHistoryRole: p.postHistoryRole,
      hasPromptTemplate: !!p.promptTemplate,
      promptTemplate: p.promptTemplate,
      isDefault: p.isDefault,
    }));
  } catch (e) {
    presets = [{ error: String(e).slice(0, 200) }];
  }

  let tableStorage: Awaited<ReturnType<typeof getTableStorageStats>> | null =
    null;
  try {
    tableStorage = await getTableStorageStats();
    logChatDebug("storage-stats", { tableStorage });
  } catch (e) {
    dbInfo.tableStorageError = String(e).slice(0, 200);
  }

  return {
    generatedAt: dayjs().toISOString(),
    tableStorage,
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
    const msg = rec(m);
    return {
      role: msg?.role,
      parts: Array.isArray(msg?.parts)
        ? recArr(msg.parts).map((p) => ({
            type: p.type,
            chars: typeof p.text === "string" ? p.text.length : undefined,
          }))
        : undefined,
    };
  });
}

const MAX_SHAPE_ROWS = 3;

async function readRequestLogsForConvDiag(convId: string): Promise<unknown[]> {
  const meta = await readLocalRequestLogMetaForConv(convId, MAX_LOGS_PER_CONV);
  const newest = await readLocalRequestLogsNewestForConv(
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

export async function buildDiagnostics(): Promise<Record<string, unknown>> {
  const head = await buildDiagnosticsHead();

  const messagesByConv: Record<string, unknown[]> = {};
  const requestLogsByConv: Record<string, unknown[]> = {};
  for (const id of head.convIds) {
    try {
      messagesByConv[id] = await readLocalMessageMetaForConv(id);
      requestLogsByConv[id] = await readRequestLogsForConvDiag(id);
    } catch (e) {
      messagesByConv[id] = [{ error: String(e).slice(0, 200) }];
    }
  }

  return {
    generatedAt: head.generatedAt,
    tableStorage: head.tableStorage,
    device: head.device,
    runtime: head.runtime,
    dbInfo: head.dbInfo,
    conversations: head.conversations,
    presets: head.presets,
    tokenizer: activeTokenizerState(),
    messagesByConv,
    requestLogsByConv,
    failedRequests: getFailedRequestCaptures(),
    caughtErrors: getCaughtErrors(),
    jsPlugins: await describeJsPlugins(),
    debugLog: head.debugLog,
  };
}

// The script body is NEVER included: this file gets pasted into public channels.
const PLUGIN_HOOKS = [
  "display",
  "editRequest",
  "editOutput",
  "editInput",
  "editProcess",
];

async function describeJsPlugins() {
  try {
    const rows = (await readLocalJsPlugins()) ?? [];
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      enabled: p.enabled,
      scriptChars: p.script.length,
      hooks: PLUGIN_HOOKS.filter((h) => p.script.includes(h)),
    }));
  } catch {
    return [];
  }
}
