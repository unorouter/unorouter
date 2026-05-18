import "server-only";
import { cookies } from "next/headers";
import {
  INITIAL_USER_THEME,
  USER_THEME_KEY,
  type UserTheme,
} from "@/components/ui/theme/theme-store";

export async function getServerTheme(): Promise<UserTheme> {
  const store = await cookies();
  const raw = store.get(USER_THEME_KEY)?.value;
  if (!raw) return INITIAL_USER_THEME;
  try {
    return { ...INITIAL_USER_THEME, ...(JSON.parse(raw) as UserTheme) };
  } catch {
    return INITIAL_USER_THEME;
  }
}
