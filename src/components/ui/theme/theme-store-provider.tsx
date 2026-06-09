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
  // No `dangerouslyForceHydrate`: with it, every render rewrites the atom,
  // which schedules a re-render of every Icon subscriber and React surfaces
  // it as a "setState while rendering a different component" warning. First
  // mount hydration is enough; cookie changes ride a full page nav anyway.
  useHydrateAtoms([[userThemeAtom, props.data ?? INITIAL_USER_THEME]]);

  return <>{props.children}</>;
}
