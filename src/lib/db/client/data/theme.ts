"use client";

import type { UserTheme } from "@/components/ui/theme/theme-store";
import { userThemes } from "@/lib/db/schema/shared";
import { dayjs } from "@/lib/utils/format/date";
import { getLocalDb } from "../client";

export async function readLocalTheme(
  userId: number | undefined,
): Promise<UserTheme | null> {
  const row = await readLocalThemeRow(userId);
  return (row?.themeJson as UserTheme | undefined) ?? null;
}

export async function readLocalThemeRow(userId: number | undefined) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db.select().from(userThemes).limit(1);
  return rows[0] ?? null;
}

export async function upsertLocalTheme(
  userId: number | undefined,
  themeJson: UserTheme,
  syncExpiresAt?: Date | null,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  const updatedAt = dayjs().toDate();
  await local.db
    .insert(userThemes)
    .values({
      userId,
      themeJson,
      syncExpiresAt: syncExpiresAt ?? null,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: userThemes.userId,
      set: { themeJson, syncExpiresAt: syncExpiresAt ?? null, updatedAt },
    });
}
