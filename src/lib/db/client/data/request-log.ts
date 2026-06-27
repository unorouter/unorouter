"use client";

import { env } from "@/lib/config/env";
import { API_ENDPOINTS } from "@/lib/ai/endpoints";
import { requestLogs } from "@/lib/db/schema/shared";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { eq } from "drizzle-orm";
import { getLocalDb } from "../client";

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
