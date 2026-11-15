"use client";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { ModelMetadata } from "@/openapi";
import { useTranslations } from "next-intl";
import { deriveCapabilityChips } from "./capability-helpers";

export function CapabilityChips(props: {
  metadata: ModelMetadata;
  limit: number;
}) {
  const t = useTranslations();
  const chips = deriveCapabilityChips(props.metadata);
  if (chips.length === 0) return null;

  const visible = chips.slice(0, props.limit);
  const overflow = chips.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((chip) => (
        <Badge
          key={chip.labelKey}
          variant="secondary"
          className="px-1.5 py-0 font-mono text-[10px] tracking-wide uppercase"
        >
          <Icon name={chip.icon} className="mr-1 h-3 w-3" />
          {chip.count != null
            ? t(chip.labelKey, { count: chip.count })
            : t(chip.labelKey)}
        </Badge>
      ))}
      {overflow > 0 && (
        <span className="text-muted-foreground font-mono text-[10px]">
          +{overflow}
        </span>
      )}
    </div>
  );
}
