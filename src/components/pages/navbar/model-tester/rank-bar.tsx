import { cn } from "@/lib/utils";

// Scale-Labs-style leaderboard primitives: a black numbered rank pill and a
// flat horizontal score bar with an earthy accent. Theme-aware (the track uses a
// token; the fill is a fixed earthy hue that reads in light and dark).

// Earthy band by pass rate: teal good, mustard mid, terra low. Muted gray when
// the sample is too small to be confident (never a confident green/red).
function barColor(pct: number, lowN: boolean): string {
  if (lowN) return "#9ca3af"; // muted gray-400
  if (pct >= 75) return "#65c2b9"; // teal
  if (pct >= 40) return "#d1b745"; // mustard
  return "#e27553"; // terra-cotta
}

export function RankPill(props: { rank: number }) {
  return (
    <span className="bg-foreground text-background flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums">
      {props.rank}
    </span>
  );
}

export function RankBar(props: { pct: number; lowN?: boolean }) {
  const lowN = props.lowN ?? false;
  const color = barColor(props.pct, lowN);
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-[2px]">
        <div
          className="absolute inset-y-0 left-0 rounded-[2px]"
          style={{
            width: `${Math.max(props.pct, 2)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-sm font-semibold tabular-nums",
          lowN && "text-muted-foreground",
        )}
        style={lowN ? undefined : { color }}
      >
        {props.pct}%
      </span>
    </div>
  );
}
