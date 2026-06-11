"use client";

import { localUserIdAtom } from "@/store/chat-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function UserIdProvider(props: { children: ReactNode; userId: number }) {
  useHydrateAtoms([[localUserIdAtom, props.userId]], {
    dangerouslyForceHydrate: true,
  });

  return <>{props.children}</>;
}
