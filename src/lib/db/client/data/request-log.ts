"use client";

import { env } from "@/lib/config/env";
import { requestLogs } from "@/lib/db/schema/shared";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { eq } from "drizzle-orm";
import { getLocalDb } from "../client";

export function buildRequestLogCurl(row: {
  requestBody: unknown;
  requestId: string | null;
}): string {
  const body =
    typeof row.requestBody === "string"
      ? row.requestBody
      : JSON.stringify(row.requestBody);
  const headers = ['-H "Content-Type: application/json"'];
  if (row.requestId) headers.push(`-H "x-request-id: ${row.requestId}"`);
  return [
    `curl ${env.apiUrl}/v1/chat/completions`,
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
