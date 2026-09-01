"use client";

import type { UserTheme } from "@/components/ui/theme/theme-store";
import { userThemes } from "@/lib/db/schema/shared";
import { dayjs } from "@/lib/utils/format/date";
import { desc, eq, lt } from "drizzle-orm";
import { getLocalDb } from "../client";

// Deep enough to walk back out of a run of bad edits or a few Shuffles, short
// enough that the table stays trivial. Older rows are pruned on every push.
const HISTORY_LIMIT = 20;

// The customizer commits on a 100ms debounce and sliders fire per tick, so a
// single drag would otherwise bury the previous theme under 20 near-identical
// entries. Writes closer together than this replace the newest row instead of
// adding one, which makes a drag a single undo step.
const COALESCE_MS = 1500;

export async function pushLocalTheme(themeJson: UserTheme) {
  const local = await getLocalDb();
  if (!local) return;
  const now = dayjs().toDate();

  const [newest] = await local.db
    .select({ id: userThemes.id, updatedAt: userThemes.updatedAt })
    .from(userThemes)
    .orderBy(desc(userThemes.id))
    .limit(1);

  if (newest && now.getTime() - newest.updatedAt.getTime() < COALESCE_MS) {
    await local.db
      .update(userThemes)
      .set({ themeJson, updatedAt: now })
      .where(eq(userThemes.id, newest.id));
    return;
  }

  await local.db.insert(userThemes).values({ themeJson, updatedAt: now });

  // Keep the newest HISTORY_LIMIT rows. Reading the cutoff id first avoids a
  // correlated subquery, which SQLocal has no reason to plan well.
  const rows = await local.db
    .select({ id: userThemes.id })
    .from(userThemes)
    .orderBy(desc(userThemes.id))
    .limit(HISTORY_LIMIT);
  const oldestKept = rows.at(-1)?.id;
  if (oldestKept != null) {
    await local.db.delete(userThemes).where(lt(userThemes.id, oldestKept));
  }
}

// The entry BEFORE the newest, plus the newest row's id so the caller can drop
// it once the theme has actually been applied. Null when there is nothing to
// step back to.
export async function readPreviousTheme(): Promise<{
  theme: UserTheme;
  dropId: number;
} | null> {
  const local = await getLocalDb();
  if (!local) return null;
  const rows = await local.db
    .select({ id: userThemes.id, themeJson: userThemes.themeJson })
    .from(userThemes)
    .orderBy(desc(userThemes.id))
    .limit(2);
  const [newest, previous] = rows;
  if (!newest || !previous) return null;
  return { theme: previous.themeJson, dropId: newest.id };
}

export async function dropThemeEntry(id: number) {
  const local = await getLocalDb();
  if (!local) return;
  await local.db.delete(userThemes).where(eq(userThemes.id, id));
}

export async function countThemeHistory(): Promise<number> {
  const local = await getLocalDb();
  if (!local) return 0;
  const rows = await local.db.select({ id: userThemes.id }).from(userThemes);
  return rows.length;
}
