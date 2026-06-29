"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Per-arc state: one arc per probe. pending = gray, pass = emerald, fail = red.
export type GaugeArc = "pending" | "pass" | "fail";

const ARC_COLOR: Record<GaugeArc, string> = {
  pending: "stroke-muted-foreground/25",
  pass: "stroke-emerald-500",
  fail: "stroke-destructive",
};

// A ring split into one arc per probe so the reader sees WHICH checks passed at a
// glance, not just an opaque percentage (the APIMaster gauge shows only a number).
export function ScoreGauge(props: {
  arcs: GaugeArc[];
  running: boolean;
  passed: number;
  total: number;
  label: string;
}) {
  const t = useTranslations();
  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const gap = 6; // px gap between arcs
  const n = Math.max(props.arcs.length, 1);
  const arcLen = circumference / n - gap;
  const pct =
    props.total > 0 ? Math.round((props.passed / props.total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={cn("-rotate-90", props.running && "animate-pulse")}
        >
          {props.arcs.map((arc, i) => {
            const offset = -(i * (arcLen + gap));
            return (
              <circle
                key={i}
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                className={cn(
                  "transition-[stroke] duration-500",
                  ARC_COLOR[arc],
                )}
                strokeDasharray={`${arcLen} ${circumference - arcLen}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold tabular-nums">
            {props.running ? "..." : `${pct}%`}
          </span>
          <span className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
            {props.running
              ? t("MODEL_TESTER.GAUGE.RUNNING")
              : props.total > 0
                ? t("MODEL_TESTER.RESULT.PASSED", {
                    passed: props.passed,
                    total: props.total,
                  })
                : t("MODEL_TESTER.GAUGE.READY")}
          </span>
        </div>
      </div>
      <span className="text-muted-foreground max-w-[16rem] text-center text-sm">
        {props.label}
      </span>
    </div>
  );
}
