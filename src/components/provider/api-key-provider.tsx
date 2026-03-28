"use client";

import { useDocs } from "@/hooks/ui/use-docs";
import {
  docsStoreAtom,
  INITIAL_DOCS_STATE,
  type DocsState,
} from "@/store/docs-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function ApiKeyProvider(props: {
  children: ReactNode;
  data?: DocsState;
}) {
  useHydrateAtoms([[docsStoreAtom, props.data ?? INITIAL_DOCS_STATE]]);

  // Trigger token resolution so the key gets written to the atom/cookie
  useDocs();

  return <>{props.children}</>;
}
