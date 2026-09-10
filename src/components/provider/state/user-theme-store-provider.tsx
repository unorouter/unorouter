"use client";

import {
  INITIAL_USER_THEME,
  userThemeAtom,
} from "@/components/ui/theme/theme-store";
import type { UserTheme } from "@/components/ui/theme/theme-store";
import { environmentManager } from "@tanstack/react-query";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

// Load-bearing half of the userThemeAtom getOnInit pair (see CLAUDE.md "State").
// The layout bakes this theme into <style id="user-theme">; without the seed the
// first client render holds INITIAL_USER_THEME and UserThemeProvider's effect
// overwrites that style tag with default CSS, dropping every chat markdown
// colour until the user edits the theme by hand.
export function UserThemeStoreProvider(props: {
  children: ReactNode;
  data?: UserTheme;
}) {
  // Same forcing rule as ChatStoreProvider: the store is a module singleton, so
  // on the server only the first request of a process would seed without it.
  useHydrateAtoms([[userThemeAtom, props.data ?? INITIAL_USER_THEME]], {
    dangerouslyForceHydrate: environmentManager.isServer(),
  });

  return <>{props.children}</>;
}
