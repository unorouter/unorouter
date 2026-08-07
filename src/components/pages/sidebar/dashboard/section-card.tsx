"use client";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard(props: SectionCardProps) {
  return (
    <div className="border-border bg-card flex min-w-0 flex-col border">
      <div className="border-border flex items-start gap-3 border-b p-5">
        {props.icon && (
          <div className="border-border text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center border">
            <Icon name={props.icon} className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-foreground block text-sm font-semibold">
            {props.title}
          </span>
          {props.subtitle && (
            <span className="text-muted-foreground block text-xs">
              {props.subtitle}
            </span>
          )}
        </div>
        {props.action}
      </div>
      <div className="flex flex-1 flex-col">{props.children}</div>
    </div>
  );
}
