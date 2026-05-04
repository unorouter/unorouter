"use client";

import {
  getIntegration,
  type IntegrationKey,
} from "@/components/pages/navbar/home/integrations";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { motion } from "motion/react";

// Cast Link to a motion-friendly component. motion.create wraps any component
// so its `style` / `animate` / `transition` props drive a spring/keyframe.
const MotionLink = motion.create(Link);

type FloatItem = {
  key: IntegrationKey;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  // Drift target the spring animates toward each cycle. The tween reverses
  // (yoyo via `repeatType: "reverse"`) so the chip springs back to origin
  // with the same physics that pushed it out.
  driftY: number; // px
  driftX: number; // px (positive = rightward gust)
  driftRot: number; // deg
  /** Scale at the drift apex. 1 = no scale change. Slightly > or < 1 simulates
   * depth as the chip tilts through 3D space — subtle "near/far" cue. */
  driftScale: number;
  // Spring parameters per chip — varied so chips don't sync.
  stiffness: number;
  damping: number;
  mass: number;
  /** Negative seconds; offsets the loop so chips don't all start at apex. */
  delay: number;
};

// Eight chips spread around an oversized box (~96px around the StatsPanel).
// Drift is rightward (matching the hero's speed-streak motion) with subtle
// vertical bob. Springs are heavily damped (no overshoot) and slow (mass 2-3)
// so chips glide smoothly between origin and drift target — the spring still
// gives a soft, decelerating settle, but no oscillation. Drift magnitudes
// are also smaller now so the overall motion is calm.
const FLOATERS: readonly FloatItem[] = [
  // NW
  {
    key: "claude-code",
    top: "0",
    left: "0",
    driftX: 30,
    driftY: -16,
    driftRot: 2,
    driftScale: 1.06,
    stiffness: 7,
    damping: 14,
    mass: 3.6,
    delay: -2.4,
  },
  // N
  {
    key: "codex",
    top: "0",
    left: "48%",
    driftX: 38,
    driftY: -20,
    driftRot: 2.5,
    driftScale: 0.94,
    stiffness: 6,
    damping: 14,
    mass: 4.0,
    delay: -3.7,
  },
  // NE
  {
    key: "risuai",
    top: "0",
    right: "0",
    driftX: 28,
    driftY: 14,
    driftRot: 1.8,
    driftScale: 1.05,
    stiffness: 8,
    damping: 16,
    mass: 3.4,
    delay: -0.6,
  },
  // E
  {
    key: "janitor-ai",
    top: "42%",
    right: "0",
    driftX: 26,
    driftY: -16,
    driftRot: -1.6,
    driftScale: 0.95,
    stiffness: 9,
    damping: 16,
    mass: 3.2,
    delay: -4.5,
  },
  // SE
  {
    key: "chub",
    bottom: "0",
    right: "0",
    driftX: 32,
    driftY: -18,
    driftRot: -2,
    driftScale: 1.07,
    stiffness: 6,
    damping: 14,
    mass: 4.0,
    delay: -1.8,
  },
  // S
  {
    key: "gemini-cli",
    bottom: "0",
    left: "52%",
    driftX: 40,
    driftY: 18,
    driftRot: 2.2,
    driftScale: 0.93,
    stiffness: 7,
    damping: 14,
    mass: 3.8,
    delay: -3.1,
  },
  // SW
  {
    key: "openclaw",
    bottom: "0",
    left: "0",
    driftX: 34,
    driftY: -14,
    driftRot: 1.6,
    driftScale: 1.05,
    stiffness: 8,
    damping: 15,
    mass: 3.5,
    delay: -2.9,
  },
  // W
  {
    key: "sillytavern",
    top: "48%",
    left: "0",
    driftX: 28,
    driftY: 16,
    driftRot: -2,
    driftScale: 0.96,
    stiffness: 9,
    damping: 16,
    mass: 3.3,
    delay: -1.2,
  },
];

export function FloatingIntegrationsMotion() {
  return (
    <TooltipProvider delay={200}>
      <div className="pointer-events-none absolute -inset-x-32 -inset-y-24 z-20 hidden lg:block motion-reduce:hidden">
        {FLOATERS.map((item) => {
          const integration = getIntegration(item.key);
          const Icon = integration.icon;
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger
                render={
                  <MotionLink
                    href={integration.href}
                    aria-label={integration.badge}
                    style={{
                      top: item.top,
                      bottom: item.bottom,
                      left: item.left,
                      right: item.right,
                    }}
                    initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
                    animate={{
                      x: item.driftX,
                      y: item.driftY,
                      rotate: item.driftRot,
                      scale: item.driftScale,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: item.stiffness,
                      damping: item.damping,
                      mass: item.mass,
                      repeat: Infinity,
                      repeatType: "reverse",
                      delay: item.delay,
                    }}
                    whileHover={{ scale: 1.15, x: 0, y: 0, rotate: 0 }}
                    className="border-border/60 bg-card/80 hover:border-foreground/40 hover:bg-card pointer-events-auto absolute flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md"
                  />
                }
              >
                {integration.logoSrc ? (
                  integration.logoBg ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={integration.logoSrc}
                        alt={integration.badge}
                        width={24}
                        height={24}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={integration.logoSrc}
                      alt={integration.badge}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  )
                ) : (
                  <Icon size={28} />
                )}
              </TooltipTrigger>
              <TooltipContent>{integration.badge}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
