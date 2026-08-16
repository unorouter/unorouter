"use client";

import type { UserTheme } from "@/components/ui/theme/theme-store";
import { userThemes } from "@/lib/db/schema/shared";
import { dayjs } from "@/lib/utils/format/date";
import { getLocalDb } from "../client";

export async function upsertLocalTheme(
  userId: number | undefined,
  themeJson: UserTheme,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  const updatedAt = dayjs().toDate();
  await local.db
    .insert(userThemes)
    .values({ userId, themeJson, updatedAt })
    .onConflictDoUpdate({
      target: userThemes.userId,
      set: { themeJson, updatedAt },
    });
}
