import { cn } from "@/lib/utils";

type GrowthTextProps = {
  value: number;
  className?: string;
};

export function GrowthText(props: GrowthTextProps) {
  const v = props.value;
  if (!Number.isFinite(v) || v === 0) {
    return (
      <span
        className={cn(
          "text-muted-foreground/80 font-mono tabular-nums",
          props.className,
        )}
      >
        0%
      </span>
    );
  }
  const isUp = v > 0;
  const magnitude = Math.abs(v).toFixed(Math.abs(v) >= 100 ? 0 : 1);
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        isUp
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400",
        props.className,
      )}
    >
      {isUp ? "+" : "-"}
      {magnitude}%
    </span>
  );
}
