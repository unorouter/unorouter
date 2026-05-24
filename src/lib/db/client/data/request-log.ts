"use client";

import { requestLogs } from "@/lib/db/schema/shared";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { eq } from "drizzle-orm";
import { getLocalDb } from "../client";

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
