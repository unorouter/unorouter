"use client";

import { Icon } from "@/components/ui/icon";
import { modelColor } from "@/lib/utils/format/color";
import { useState } from "react";

const PER_PAGE = 24;

// The bars only stack the top N models, so the full ranked list would otherwise
// be invisible. Paginate it rather than silently truncating.
export function PagedChartLegend(props: { names: string[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(props.names.length / PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const slice = props.names.slice(
    current * PER_PAGE,
    current * PER_PAGE + PER_PAGE,
  );

  if (props.names.length === 0) return null;

  return (
    <div className="flex items-start gap-3 pt-3">
      <div className="flex flex-1 flex-wrap gap-x-3 gap-y-1.5">
        {slice.map((name) => (
          <span key={name} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0"
              style={{ backgroundColor: modelColor(name) }}
            />
            <span
              className="text-muted-foreground max-w-48 truncate font-mono text-[10px]"
              title={name}
            >
              {name}
            </span>
          </span>
        ))}
      </div>
      {pageCount > 1 && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
          >
            <Icon name="chevron-left" className="h-3.5 w-3.5" />
          </button>
          <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
            {current + 1}/{pageCount}
          </span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount - 1}
          >
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
