"use client";

import { useSuitableToken } from "@/hooks/use-suitable-token";
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
  useHydrateAtoms([
    [docsStoreAtom, props.data ?? INITIAL_DOCS_STATE],
  ]);

  // Trigger token resolution so the key gets written to the atom/cookie
  useSuitableToken();

  return <>{props.children}</>;
}
