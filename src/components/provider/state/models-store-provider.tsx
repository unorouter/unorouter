"use client";

import {
  INITIAL_MODELS_STATE,
  modelsStoreAtom,
  type ModelsStoreState,
} from "@/store/models-store";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";

export function ModelsStoreProvider(props: {
  children: ReactNode;
  data?: ModelsStoreState;
}) {
  useHydrateAtoms([[modelsStoreAtom, props.data ?? INITIAL_MODELS_STATE]]);

  return <>{props.children}</>;
}
