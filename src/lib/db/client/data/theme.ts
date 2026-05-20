"use client";

import type { UserTheme } from "@/components/ui/theme/theme-store";
import { userThemes } from "@/lib/db/schema/shared";
import { getLocalDb } from "../client";

export async function upsertLocalTheme(
  userId: number | undefined,
  themeJson: UserTheme,
  syncExpiresAt?: Date | null,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  const updatedAt = new Date();
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
