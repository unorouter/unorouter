"use client";

import { env } from "@/lib/config/env";
import { API_ENDPOINTS } from "@/lib/ai/endpoints";
import { requestLogs } from "@/lib/db/schema/shared";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { desc, eq, notInArray } from "drizzle-orm";
import { getLocalDb } from "../client";

// Each request_logs row snapshots the FULL post-assembly prompt (~4MB), so an unbounded table hits
// hundreds of MB fast. The sheet is a debug aid that only inspects the most RECENT requests, so keep
// a small global window and trim the rest on every insert. Chats/messages are untouched (tiny).
const MAX_REQUEST_LOGS = 15;

// Reproducible curl for a logged request. Token is intentionally a placeholder ($UNOROUTER_API_KEY),
// never the real key. Uses the stored upstream url/endpoint (text -> chat/completions, media -> the
// image/audio/embedding path); falls back to the chat-completions default for older rows.
export function buildRequestLogCurl(row: {
  requestBody: unknown;
  requestId: string | null;
  url?: string | null;
  endpoint?: string | null;
}): string {
  const target =
    row.url || `${env.apiUrl}${row.endpoint ?? API_ENDPOINTS.chatCompletions}`;
  const body =
    typeof row.requestBody === "string"
      ? row.requestBody
      : JSON.stringify(row.requestBody);
  const headers = [
    '-H "Authorization: Bearer $UNOROUTER_API_KEY"',
    '-H "Content-Type: application/json"',
  ];
  if (row.requestId) headers.push(`-H "x-request-id: ${row.requestId}"`);
  return [
    `curl ${target}`,
    ...headers.map((h) => `  ${h}`),
    `  -d '${body.replace(/'/g, "'\\''")}'`,
  ].join(" \\\n");
}

export async function insertLocalRequestLog(
  userId: number | undefined,
  row: RequestLogRow,
): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(requestLogs)
    .values(row)
    .onConflictDoUpdate({ target: requestLogs.msgId, set: row });
  // Trim to the newest MAX_REQUEST_LOGS globally so the debug table can't grow unbounded.
  const keep = await local.db
    .select({ msgId: requestLogs.msgId })
    .from(requestLogs)
    .orderBy(desc(requestLogs.createdAt))
    .limit(MAX_REQUEST_LOGS);
  if (keep.length >= MAX_REQUEST_LOGS) {
    await local.db.delete(requestLogs).where(
      notInArray(
        requestLogs.msgId,
        keep.map((r) => r.msgId),
      ),
    );
  }
}

// Wipe ALL request_logs (the heaviest table: full per-turn prompt snapshots). Called before a DB
// backup so the export is a clean slate; the request-log sheet is a debug aid, not backup-worthy.
export async function clearAllRequestLogs(
  userId: number | undefined,
): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db.delete(requestLogs);
}

// Overwrite the stream-time estimates with new-api's authoritative figures (resolved post-finish by logEnrich). No-op when the row is gone.
export async function patchLocalRequestLogUpstream(
  userId: number | undefined,
  msgId: string,
  patch: {
    cost?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    durationMs?: number | null;
    channelName?: string | null;
  },
): Promise<void> {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .update(requestLogs)
    .set(patch)
    .where(eq(requestLogs.msgId, msgId));
}

export async function readLocalRequestLog(
  userId: number | undefined,
  msgId: string,
): Promise<RequestLogRow | null> {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(requestLogs)
    .where(eq(requestLogs.msgId, msgId))
    .limit(1);
  return rows[0] ?? null;
}

export async function readLocalRequestLogsForConv(
  userId: number | undefined,
  convId: string,
): Promise<RequestLogRow[]> {
  const local = await getLocalDb(userId);
  if (!local) return [];
  return local.db
    .select()
    .from(requestLogs)
    .where(eq(requestLogs.convId, convId));
}

// Lean reader for diagnostics: projects ONLY metadata columns (NEVER the giant
// finalMessages/requestBody prompt snapshots) and caps rows in SQL, so a 50-100MB
// request_logs table can't materialize its blobs in memory and OOM the export.
export type RequestLogMeta = {
  msgId: string | null;
  convId: string | null;
  requestId: string | null;
  channelName: string | null;
  inputTokens: number | null;
  createdAt: Date | null;
};

export async function readLocalRequestLogMetaForConv(
  userId: number | undefined,
  convId: string,
  limit: number,
): Promise<RequestLogMeta[]> {
  const local = await getLocalDb(userId);
  if (!local) return [];
  return local.db
    .select({
      msgId: requestLogs.msgId,
      convId: requestLogs.convId,
      requestId: requestLogs.requestId,
      channelName: requestLogs.channelName,
      inputTokens: requestLogs.inputTokens,
      createdAt: requestLogs.createdAt,
    })
    .from(requestLogs)
    .where(eq(requestLogs.convId, convId))
    .orderBy(desc(requestLogs.createdAt))
    .limit(limit);
}
