"use client";

import type { UserTheme } from "@/components/ui/theme/theme-store";
import { userThemes } from "@/lib/db/schema/shared";
import { dayjs } from "@/lib/utils/format/date";
import { getLocalDb } from "../client";

// One theme per device, so one row.
const THEME_ROW_ID = 1;

export async function upsertLocalTheme(themeJson: UserTheme) {
  const local = await getLocalDb();
  if (!local) return;
  const updatedAt = dayjs().toDate();
  await local.db
    .insert(userThemes)
    .values({ id: THEME_ROW_ID, themeJson, updatedAt })
    .onConflictDoUpdate({
      target: userThemes.id,
      set: { themeJson, updatedAt },
    });
}
