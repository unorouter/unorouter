"use client";

import { ConsumptionChart } from "./consumption-chart";
import { PerformanceStrip } from "./performance-panel";
import { StatsCards } from "./stats-cards";

export function AnalyticsSection() {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-border bg-card border">
        <StatsCards />
      </div>
      <PerformanceStrip />
      <ConsumptionChart />
    </div>
  );
}
