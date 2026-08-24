"use client";

import { Icon } from "@/components/ui/icon";
import { useState } from "react";

type Props = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function CollapsibleSection(props: Props) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
      >
        <Icon
          name={open ? "chevron-down" : "chevron-right"}
          className="h-4 w-4 shrink-0"
        />
        {props.title}
        {!open && props.summary && (
          <span className="text-muted-foreground ml-auto truncate text-xs tabular-nums">
            {props.summary}
          </span>
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t p-3">{props.children}</div>
      )}
    </div>
  );
}
