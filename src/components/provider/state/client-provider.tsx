"use client";

import {
  clientStoreAtom,
  INITIAL_CLIENT_STATE,
  type ClientState,
} from "@/store/client-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function ClientProvider(props: {
  children: ReactNode;
  data?: ClientState;
}) {
  useHydrateAtoms([[clientStoreAtom, props.data ?? INITIAL_CLIENT_STATE]], {
    dangerouslyForceHydrate: true,
  });

  return <>{props.children}</>;
}
