"use client";

import { cn } from "@/lib/utils";

type TickerModel = {
  name: string;
  vendor: string;
};

type Props = {
  models: TickerModel[];
  className?: string;
};

export function ModelTicker(props: Props) {
  const doubled = [...props.models, ...props.models];

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        props.className
      )}
    >
      <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r to-transparent" />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l to-transparent" />
      <div className="animate-ticker flex w-max gap-6">
        {doubled.map((model, i) => (
          <div
            key={`${model.name}-${i}`}
            className="border-border bg-card flex items-center gap-3 rounded-md border px-4 py-2"
          >
            <span className="text-muted-foreground font-mono text-xs uppercase">
              {model.vendor}
            </span>
            <span className="text-foreground text-sm font-medium">
              {model.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
