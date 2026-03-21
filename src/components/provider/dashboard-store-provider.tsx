"use client";

import {
  defaultTimestamps,
  type DashboardStore,
  dashboardStoreAtom,
} from "@/store/dashboard-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function DashboardStoreProvider(props: {
  children: ReactNode;
  data?: DashboardStore;
}) {
  useHydrateAtoms([[dashboardStoreAtom, props.data ?? defaultTimestamps()]]);

  return <>{props.children}</>;
}
