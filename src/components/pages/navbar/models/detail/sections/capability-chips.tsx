"use client";

import { Badge } from "@/components/ui/badge";
import type { ModelMetadata } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { deriveCapabilityChips } from "./capability-helpers";

type Props = {
  metadata: ModelMetadata;
  /** When set, only the first N chips are rendered with a "+M" overflow. */
  limit?: number;
  className?: string;
  variant?: "drawer" | "card";
};

export function CapabilityChips(props: Props) {
  const t = useTranslations();
  const chips = deriveCapabilityChips(props.metadata);
  if (chips.length === 0) return null;

  const limit = props.limit ?? Number.POSITIVE_INFINITY;
  const visible = chips.slice(0, limit);
  const overflow = chips.length - visible.length;
  const isCard = props.variant === "card";

  return (
    <div className={cn("flex flex-wrap items-center gap-1", props.className)}>
      {visible.map((chip) => (
        <Badge
          key={chip.labelKey}
          variant="secondary"
          className={cn(
            "font-mono text-[10px] tracking-wide uppercase",
            isCard && "px-1.5 py-0",
          )}
        >
          {t(chip.labelKey)}
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
