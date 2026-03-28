"use client";

import { useSuitableToken } from "@/hooks/use-suitable-token";
import { apiKeyAtom } from "@/store/api-key-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function ApiKeyProvider(props: {
  children: ReactNode;
  data?: string | null;
}) {
  useHydrateAtoms([[apiKeyAtom, props.data ?? null]]);

  // Trigger token resolution so the key gets written to the atom/cookie
  useSuitableToken();

  return <>{props.children}</>;
}
