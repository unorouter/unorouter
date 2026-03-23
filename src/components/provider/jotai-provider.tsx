"use client";

import { Provider } from "jotai";
import type { ReactNode } from "react";

export function JotaiProvider(props: { children: ReactNode }) {
  return <Provider>{props.children}</Provider>;
}
