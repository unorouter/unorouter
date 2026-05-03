"use client";

import { useStatusComponents } from "@/hooks/use-model-status-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type StatusVariant = "dot" | "full";

export function StatusPill(props: {
  modelName: string;
  variant?: StatusVariant;
  className?: string;
}) {
  const t = useTranslations();
  const q = useStatusComponents();
  const row = q.data?.find((r) => r.name === props.modelName);
  const status = row?.status ?? "empty";

  const color =
    status === "success"
      ? "bg-emerald-500"
      : status === "degraded"
        ? "bg-amber-500"
        : status === "error"
          ? "bg-red-500"
          : "bg-zinc-400";

  const label =
    status === "success"
      ? t("STATUS.STATE.OPERATIONAL")
      : status === "degraded"
        ? t("STATUS.STATE.DEGRADED")
        : status === "error"
          ? t("STATUS.STATE.DOWN")
          : t("STATUS.STATE.UNKNOWN");

  if (props.variant === "full") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase",
          props.className,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
        {label}
      </span>
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        color,
        props.className,
      )}
    />
  );
}
