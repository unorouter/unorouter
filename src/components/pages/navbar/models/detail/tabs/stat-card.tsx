import { cn } from "@/lib/utils";
import { type StatIntent } from "@/lib/utils/format/math";

const STAT_INTENT_CLASS: Record<StatIntent, string> = {
  default: "",
  warning: "text-amber-700 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
};

export function StatCard(props: {
  label: string;
  value: string;
  hint?: string;
  intent?: StatIntent;
}) {
  return (
    <div className="border-border bg-background flex flex-col gap-1 rounded-md border p-3">
      <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
        {props.label}
      </span>
      <span
        className={cn(
          "text-foreground font-mono text-base font-semibold tabular-nums",
          STAT_INTENT_CLASS[props.intent ?? "default"],
        )}
      >
        {props.value}
      </span>
      {props.hint && (
        <span className="text-muted-foreground/70 text-[10px]">
          {props.hint}
        </span>
      )}
    </div>
  );
}
