"use client";

import {
  INITIAL_USER_THEME,
  type UserTheme,
  userThemeAtom,
} from "@/components/ui/theme/theme-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function UserThemeStoreProvider(props: {
  children: ReactNode;
  data?: UserTheme;
}) {
  useHydrateAtoms([[userThemeAtom, props.data ?? INITIAL_USER_THEME]]);

  return <>{props.children}</>;
}
