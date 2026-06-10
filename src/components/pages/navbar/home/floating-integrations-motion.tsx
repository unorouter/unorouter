"use client";

import { GuideIcon } from "@/components/pages/docs/guide-icon";
import { SETUP_GUIDES } from "@/components/pages/docs/setup-guides";
import { Link } from "@/i18n/navigation";

// Floating brand chips around the stats card. No JS animation (27 perpetual
// springs lagged); one shared CSS keyframe + per-chip delay drifts on the GPU.
// Half above, half below, so the card stays clear.

const COLS = 7;
// Span the stats card's x-range (it sits ~0%-84% of the overlay, centered ~42%)
// so the chips wrap symmetrically around the card instead of hanging off its
// right edge.
const X_START = 2;
const X_END = 84;
const TOP_ROW_Y = [-2, 8];
const BOTTOM_ROW_Y = [88, 98];
const HALF = Math.ceil(SETUP_GUIDES.length / 2);

const PLACED = SETUP_GUIDES.map((guide, i) => {
  const above = i < HALF;
  const n = above ? i : i - HALF;
  const col = n % COLS;
  const row = Math.floor(n / COLS);
  // Even column base + a small per-row stagger so the two rows aren't a rigid
  // grid (alternate rows nudge half a step + the odd ones sit a bit lower).
  const stagger = row % 2 === 0 ? 0 : (X_END - X_START) / (COLS - 1) / 2;
  const leftPct = X_START + (col / (COLS - 1)) * (X_END - X_START) + stagger;
  const baseTop = (above ? TOP_ROW_Y : BOTTOM_ROW_Y)[row] ?? (above ? 4 : 96);
  // Per-column nudge so rows aren't dead flat, but always AWAY from the card
  // (top band nudges up, bottom band nudges down) so it never overlaps.
  const topPct = baseTop + (col % 3) * (above ? -2 : 2);
  return {
    slug: guide.slug,
    iconKey: guide.iconKey,
    logoSrc: guide.logoSrc,
    logoBg: guide.logoBg,
    href: guide.href,
    top: `${topPct}%`,
    left: `${leftPct}%`,
    // Visible drift (18-30px), staggered, 8-13s. transform-only, no
    // will-change - keeps it on the compositor without 27 GPU layers.
    fx: `${(i % 2 === 0 ? 1 : -1) * (16 + (i % 4) * 5)}px`,
    fy: `${(above ? -1 : 1) * (14 + (i % 4) * 5)}px`,
    delay: `${-(i % 9) * 1.1}s`,
    duration: `${8 + (i % 6)}s`,
  };
});

export function FloatingIntegrationsMotion(props: {
  titles: Record<string, string>;
}) {
  return (
    <div className="pointer-events-none absolute -inset-x-32 -inset-y-24 z-20 hidden motion-reduce:hidden lg:block">
      {PLACED.map((item) => (
        <Link
          key={item.slug}
          href={item.href}
          aria-label={props.titles[item.slug] ?? item.slug}
          title={props.titles[item.slug] ?? item.slug}
          style={{
            top: item.top,
            left: item.left,
            animationDuration: item.duration,
            animationDelay: item.delay,
            ["--fx" as string]: item.fx,
            ["--fy" as string]: item.fy,
          }}
          className="animate-float-chip border-border/60 bg-card/60 hover:border-foreground/40 hover:bg-card pointer-events-auto absolute flex size-11 items-center justify-center rounded-full border opacity-70 transition-[opacity,border-color] duration-200 hover:opacity-100"
        >
          <GuideIcon
            iconKey={item.iconKey}
            logoSrc={item.logoSrc}
            logoBg={item.logoBg}
            size={24}
          />
        </Link>
      ))}
    </div>
  );
}
