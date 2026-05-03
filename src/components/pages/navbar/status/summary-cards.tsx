"use client";

import { useStatusComponents } from "@/hooks/use-model-status-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { IconType } from "react-icons";
import {
  LuCircleAlert,
  LuCircleCheck,
  LuCircleX,
  LuLayers,
} from "react-icons/lu";

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
    icon: IconType;
  }[] = [
    {
      label: t("STATUS.KPI.TOTAL"),
      value: total,
      accent: "text-foreground",
      icon: LuLayers,
    },
    {
      label: t("STATUS.KPI.OPERATIONAL"),
      value: operational,
      accent: "text-emerald-500",
      icon: LuCircleCheck,
    },
    {
      label: t("STATUS.STATE.DEGRADED"),
      value: degraded,
      accent: degraded > 0 ? "text-amber-500" : "text-muted-foreground",
      icon: LuCircleAlert,
    },
    {
      label: t("STATUS.KPI.DOWN"),
      value: down,
      accent: down > 0 ? "text-red-500" : "text-muted-foreground",
      icon: LuCircleX,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="bg-card/50 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                {c.label}
              </p>
              <Icon className={cn("h-4 w-4", c.accent)} />
            </div>
            <p
              className={cn("mt-1 font-mono text-3xl font-semibold", c.accent)}
            >
              {c.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
