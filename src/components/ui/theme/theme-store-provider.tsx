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
  // No `dangerouslyForceHydrate`: it rewrites the atom every render (setState-
  // while-rendering warning). First-mount hydration is enough; cookie changes
  // ride a full page nav anyway.
  useHydrateAtoms([[userThemeAtom, props.data ?? INITIAL_USER_THEME]]);

  return <>{props.children}</>;
}
