"use client";

import { env } from "@/lib/config/env";
import { API_ENDPOINTS } from "@/lib/ai/endpoints";
import { conversations, requestLogs } from "@/lib/db/schema/shared";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { getLocalDb } from "@/lib/db/client/client";
import { rec, recArr } from "@/lib/utils/base";

// Rows past this are DELETED, not trimmed, so this is the real ceiling on how
// far back a request log can be read.
export const MAX_REQUEST_LOGS = 200;

function wireMessage(m: unknown): { role: string; content: string } {
  const msg = rec(m);
  const content = recArr(msg?.parts)
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("\n");
  return {
    role: typeof msg?.role === "string" ? msg.role : "user",
    content,
  };
}

export function buildRequestLogCurl(row: {
  requestBody: unknown;
  requestId: string | null;
  url?: string | null;
  endpoint?: string | null;
  assembledSystem?: string | null;
  finalMessages?: unknown;
}): string {
  const target =
    row.url || `${env.apiUrl}${row.endpoint ?? API_ENDPOINTS.chatCompletions}`;
  const rawModel = rec(row.requestBody)?.model;
  const model = typeof rawModel === "string" ? rawModel : "";
  const messages = [
    ...(row.assembledSystem
      ? [{ role: "system", content: row.assembledSystem }]
      : []),
    ...(Array.isArray(row.finalMessages)
      ? row.finalMessages.map(wireMessage)
      : []),
  ];
  const body = JSON.stringify(
    messages.length > 0 ? { model, messages } : row.requestBody,
  );
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

export async function insertLocalRequestLog(row: RequestLogRow): Promise<void> {
  const local = await getLocalDb();
  if (!local) return;
  await local.db
    .insert(requestLogs)
    .values(row)
    .onConflictDoUpdate({ target: requestLogs.msgId, set: row });
  const keep = await local.db
    .select({ msgId: requestLogs.msgId })
    .from(requestLogs)
    .where(eq(requestLogs.convId, row.convId))
    .orderBy(desc(requestLogs.createdAt))
    .limit(MAX_REQUEST_LOGS);
  if (keep.length >= MAX_REQUEST_LOGS) {
    await local.db.delete(requestLogs).where(
      and(
        eq(requestLogs.convId, row.convId),
        notInArray(
          requestLogs.msgId,
          keep.map((r) => r.msgId),
        ),
      ),
    );
  }
}

// Each log stores the full assembled conversation (~38KB average), so a long
// thread grows them quadratically. Only the reproduce-the-request payload is
// emptied; the rows stay, since cost/token history is read from them.
const KEEP_FULL_LOGS_PER_CONV = 10;

export async function trimRequestLogPayloads(): Promise<number> {
  const local = await getLocalDb();
  if (!local) return 0;
  const res = await local.exec(
    `UPDATE request_logs
       SET final_messages = '[]', assembled_system = NULL, request_body = '{}'
     WHERE length(final_messages) + coalesce(length(assembled_system),0) > 20000
       AND msg_id NOT IN (
         SELECT msg_id FROM (
           SELECT msg_id, row_number() OVER (
             PARTITION BY conv_id ORDER BY created_at DESC
           ) AS rn FROM request_logs
         ) WHERE rn <= ${KEEP_FULL_LOGS_PER_CONV}
       )`,
    [],
    "run",
  );
  return Number(res.numAffectedRows ?? 0);
}

export async function patchLocalRequestLogUpstream(
  msgId: string,
  patch: {
    cost?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    durationMs?: number | null;
    channelName?: string | null;
  },
): Promise<void> {
  const local = await getLocalDb();
  if (!local) return;
  await local.db
    .update(requestLogs)
    .set(patch)
    .where(eq(requestLogs.msgId, msgId));
}

export async function readLocalRequestLog(
  msgId: string,
): Promise<RequestLogRow | null> {
  const local = await getLocalDb();
  if (!local) return null;
  const rows = await local.db
    .select()
    .from(requestLogs)
    .where(eq(requestLogs.msgId, msgId))
    .limit(1);
  return rows[0] ?? null;
}

export async function readLocalRequestLogsForConv(
  convId: string,
): Promise<RequestLogRow[]> {
  const local = await getLocalDb();
  if (!local) return [];
  return local.db
    .select()
    .from(requestLogs)
    .where(eq(requestLogs.convId, convId));
}

export async function readLocalRequestLogsNewestForConv(
  convId: string,
  limit: number,
): Promise<RequestLogRow[]> {
  const local = await getLocalDb();
  if (!local) return [];
  return local.db
    .select()
    .from(requestLogs)
    .where(eq(requestLogs.convId, convId))
    .orderBy(desc(requestLogs.createdAt))
    .limit(limit);
}

export type RequestLogMeta = {
  msgId: string | null;
  convId: string | null;
  requestId: string | null;
  channelName: string | null;
  inputTokens: number | null;
  createdAt: Date | null;
};

// One row per request, WITHOUT the payload columns: those average ~38KB each,
// so selecting them for a 700-message thread would pull tens of megabytes to
// render a table that shows none of it. Retention empties those columns anyway
// while keeping these, so this list stays complete for the whole history.
export type RequestLogListRow = {
  msgId: string;
  convId: string;
  convTitle: string | null;
  model: string | null;
  channelName: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
  durationMs: number | null;
  tokensPerSecond: number | null;
  createdAt: Date | null;
};

export async function readRequestLogList(
  convId: string | null,
): Promise<RequestLogListRow[]> {
  const local = await getLocalDb();
  if (!local) return [];
  const rows = await local.db
    .select({
      msgId: requestLogs.msgId,
      convId: requestLogs.convId,
      convTitle: conversations.title,
      // model lives inside the request body; json_extract keeps the blob out of
      // the result set instead of parsing 700 payloads in JS.
      model: sql<
        string | null
      >`json_extract(${requestLogs.requestBody}, '$.model')`,
      channelName: requestLogs.channelName,
      inputTokens: requestLogs.inputTokens,
      outputTokens: requestLogs.outputTokens,
      cost: requestLogs.cost,
      durationMs: requestLogs.durationMs,
      tokensPerSecond: requestLogs.tokensPerSecond,
      createdAt: requestLogs.createdAt,
    })
    .from(requestLogs)
    .leftJoin(conversations, eq(conversations.id, requestLogs.convId))
    .where(convId ? eq(requestLogs.convId, convId) : undefined)
    .orderBy(desc(requestLogs.createdAt));
  return rows;
}

export async function readLocalRequestLogMetaForConv(
  convId: string,
  limit: number,
): Promise<RequestLogMeta[]> {
  const local = await getLocalDb();
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
