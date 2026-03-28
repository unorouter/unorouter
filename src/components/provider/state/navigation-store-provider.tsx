"use client";

import {
  INITIAL_NAVIGATION_STATE,
  navigationAtom,
  type NavigationState,
} from "@/store/navigation-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function NavigationStoreProvider(props: {
  children: ReactNode;
  data?: NavigationState;
}) {
  useHydrateAtoms([[navigationAtom, props.data ?? INITIAL_NAVIGATION_STATE]]);

  return <>{props.children}</>;
}
