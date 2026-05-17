"use client";

import { useStatusComponents } from "@/hooks/use-model-status-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";

export function SummaryCards() {
  const t = useTranslations();
  const q = useStatusComponents();
  const rows = q.data ?? [];

  const total = rows.length;
  const operational = rows.filter((r) => r.status === "success").length;
  const degraded = rows.filter((r) => r.status === "degraded").length;
  const down = rows.filter((r) => r.status === "error").length;

  const cards: {
    label: string;
    value: number;
    accent: string;
    icon: IconName;
  }[] = [
    {
      label: t("STATUS.KPI.TOTAL"),
      value: total,
      accent: "text-foreground",
      icon: "layers",
    },
    {
      label: t("STATUS.KPI.OPERATIONAL"),
      value: operational,
      accent: "text-emerald-500",
      icon: "circle-check",
    },
    {
      label: t("STATUS.STATE.DEGRADED"),
      value: degraded,
      accent: degraded > 0 ? "text-amber-500" : "text-muted-foreground",
      icon: "circle-alert",
    },
    {
      label: t("STATUS.KPI.DOWN"),
      value: down,
      accent: down > 0 ? "text-red-500" : "text-muted-foreground",
      icon: "circle-x",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-card/50 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              {c.label}
            </p>
            <Icon name={c.icon} className={cn("h-4 w-4", c.accent)} />
          </div>
          <p
            className={cn("mt-1 font-mono text-3xl font-semibold", c.accent)}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
