"use client";

import {
  docsStoreAtom,
  INITIAL_DOCS_STATE,
  type DocsState,
} from "@/store/docs-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function DocsProvider(props: { children: ReactNode; data?: DocsState }) {
  useHydrateAtoms([[docsStoreAtom, props.data ?? INITIAL_DOCS_STATE]]);

  return <>{props.children}</>;
}
