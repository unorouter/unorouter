"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

export type StatItemProps = {
  label: string;
  value: string | number | undefined;
  icon: ReactNode;
  isLoading: boolean;
  accentColor: string;
  trend?: ReactNode;
};

export function StatItem(props: StatItemProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center"
        style={{ color: props.accentColor }}
      >
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground block font-mono text-[10px] tracking-widest uppercase">
          {props.label}
        </span>
        {props.isLoading ? (
          <Skeleton className="mt-1 h-5 w-20" />
        ) : (
          <span className="text-foreground block text-lg font-bold tracking-tight tabular-nums">
            {typeof props.value === "number"
              ? props.value.toLocaleString()
              : (props.value ?? "-")}
          </span>
        )}
      </div>
      {!props.isLoading && props.trend}
    </div>
  );
}
