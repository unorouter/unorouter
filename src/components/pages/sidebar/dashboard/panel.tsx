"use client";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";

export function PanelEmpty(props: { icon: IconName; label: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-2">
      <Icon
        name={props.icon}
        className="text-muted-foreground h-8 w-8 opacity-20"
      />
      <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
        {props.label}
      </span>
    </div>
  );
}
