"use client";

import { getVendorTheme } from "@/lib/config/vendor-registry";
import type { StatusBucket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SectionHeading } from "../shared/section-heading";
import { PerformanceSection } from "./performance-section";
import { UptimeSection } from "./uptime-section";

type Theme = ReturnType<typeof getVendorTheme>;

type Window = { hours: number; bucket: StatusBucket };
const WINDOWS: Record<"24h" | "7d", Window> = {
  "24h": { hours: 24, bucket: "15m" },
  "7d": { hours: 168, bucket: "1h" },
};

// Owns the shared 24h/7d window toggle and renders BOTH the performance and
// uptime sections against it. Client-side so the toggle re-queries both.
export function PerfUptimePanel(props: { modelName: string; theme: Theme }) {
  const t = useTranslations();
  const [key, setKey] = useState<"24h" | "7d">("24h");
  const win = WINDOWS[key];

  const toggle = (
    <div className="border-border inline-flex overflow-hidden rounded-md border">
      {(["24h", "7d"] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => setKey(k)}
          className={cn(
            "px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase transition-colors",
            key === k
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {k === "24h"
            ? t("MODELS.DETAIL.WINDOW_24H")
            : t("MODELS.DETAIL.WINDOW_7D")}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <section className="mt-12">
        <SectionHeading theme={props.theme} action={toggle}>
          {t("MODELS.DETAIL.UPTIME")}
        </SectionHeading>
        <UptimeSection
          model={props.modelName}
          bucket={win.bucket}
          hours={win.hours}
        />
      </section>

      <section className="mt-12">
        <SectionHeading theme={props.theme}>
          {t("MODELS.DETAIL.PERFORMANCE")}
        </SectionHeading>
        <PerformanceSection modelName={props.modelName} hours={win.hours} />
      </section>
    </>
  );
}
