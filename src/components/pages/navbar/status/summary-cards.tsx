"use client";

import { Icon } from "@/components/ui/icon";
import { useStatusComponents } from "@/hooks/models/model-status-hook";
import type { IconName } from "@/lib/config/icon-map";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Card = {
  label: string;
  value: number;
  accent: string;
  icon: IconName;
};

export function SummaryCards() {
  const t = useTranslations();
  const q = useStatusComponents();
  const rows = q.data ?? [];

  const counts = { operational: 0, degraded: 0, down: 0 };
  for (const r of rows) {
    if (r.status === "success") counts.operational += 1;
    else if (r.status === "degraded") counts.degraded += 1;
    else if (r.status === "error") counts.down += 1;
  }

  const cards: Card[] = [
    {
      label: t("STATUS.KPI.TOTAL"),
      value: rows.length,
      accent: "text-foreground",
      icon: "layers",
    },
    {
      label: t("STATUS.KPI.OPERATIONAL"),
      value: counts.operational,
      accent: "text-emerald-700 dark:text-emerald-400",
      icon: "circle-check",
    },
    {
      label: t("STATUS.STATE.DEGRADED"),
      value: counts.degraded,
      accent:
        counts.degraded > 0
          ? "text-amber-700 dark:text-amber-400"
          : "text-muted-foreground",
      icon: "circle-alert",
    },
    {
      label: t("STATUS.KPI.DOWN"),
      value: counts.down,
      accent: counts.down > 0 ? "text-red-500" : "text-muted-foreground",
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
          <p className={cn("mt-1 font-mono text-3xl font-semibold", c.accent)}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
