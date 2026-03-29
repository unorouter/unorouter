"use client";

import { useDocs } from "@/hooks/ui/use-docs";
import type { OS } from "@/store/docs-store";
import type { ReactNode } from "react";

type Props = {
  variants: Record<OS, ReactNode>;
};

export function OSQuickStart(props: Props) {
  const docs = useDocs();
  return <>{props.variants[docs.os ?? "windows"]}</>;
}
