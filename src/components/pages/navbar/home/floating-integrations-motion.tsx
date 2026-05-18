"use client";

import { IntegrationLogo } from "@/components/pages/navbar/home/integration-logo";
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

// Two-layer chip: the outer motion.div owns the spring drift (x/y/rotate/scale),
// the inner Link owns hover styling. This split prevents the previous bug
// where `whileHover` would yank the chip back to its anchor — the spring loop
// keeps running independently and only the inner element responds to hover.

type Anchor = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
};

type Drift = { x: number; y: number; rot: number; scale: number };

type Spring = {
  stiffness: number;
  damping: number;
  mass: number;
  /** Negative seconds; offsets the loop so chips don't all start at apex. */
  delay: number;
};

type FloatItem = {
  key: IntegrationKey;
  anchor: Anchor;
  drift: Drift;
  spring: Spring;
};

// Eight chips spread around an oversized box (~96px around the StatsPanel).
// Drift is rightward (matching the hero's speed-streak motion) with subtle
// vertical bob. Springs are heavily damped (no overshoot) and slow (mass 2-3)
// so chips glide smoothly between origin and drift target.
const FLOATERS: readonly FloatItem[] = [
  {
    key: "claude-code",
    anchor: { top: "0", left: "0" },
    drift: { x: 30, y: -16, rot: 2, scale: 1.06 },
    spring: { stiffness: 7, damping: 14, mass: 3.6, delay: -2.4 },
  },
  {
    key: "codex",
    anchor: { top: "0", left: "48%" },
    drift: { x: 38, y: -20, rot: 2.5, scale: 0.94 },
    spring: { stiffness: 6, damping: 14, mass: 4.0, delay: -3.7 },
  },
  {
    key: "risuai",
    anchor: { top: "0", right: "0" },
    drift: { x: 28, y: 14, rot: 1.8, scale: 1.05 },
    spring: { stiffness: 8, damping: 16, mass: 3.4, delay: -0.6 },
  },
  {
    key: "janitor-ai",
    anchor: { top: "42%", right: "0" },
    drift: { x: 26, y: -16, rot: -1.6, scale: 0.95 },
    spring: { stiffness: 9, damping: 16, mass: 3.2, delay: -4.5 },
  },
  {
    key: "chub",
    anchor: { bottom: "0", right: "0" },
    drift: { x: 32, y: -18, rot: -2, scale: 1.07 },
    spring: { stiffness: 6, damping: 14, mass: 4.0, delay: -1.8 },
  },
  {
    key: "gemini-cli",
    anchor: { bottom: "0", left: "52%" },
    drift: { x: 40, y: 18, rot: 2.2, scale: 0.93 },
    spring: { stiffness: 7, damping: 14, mass: 3.8, delay: -3.1 },
  },
  {
    key: "openclaw",
    anchor: { bottom: "0", left: "0" },
    drift: { x: 34, y: -14, rot: 1.6, scale: 1.05 },
    spring: { stiffness: 8, damping: 15, mass: 3.5, delay: -2.9 },
  },
  {
    key: "sillytavern",
    anchor: { top: "48%", left: "0" },
    drift: { x: 28, y: 16, rot: -2, scale: 0.96 },
    spring: { stiffness: 9, damping: 16, mass: 3.3, delay: -1.2 },
  },
];

export function FloatingIntegrationsMotion() {
  return (
    <TooltipProvider delay={200}>
      <div className="pointer-events-none absolute -inset-x-32 -inset-y-24 z-20 hidden motion-reduce:hidden lg:block">
        {FLOATERS.map((item) => {
          const integration = getIntegration(item.key);
          return (
            <motion.div
              key={item.key}
              className="pointer-events-none absolute"
              style={item.anchor}
              initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
              animate={{
                x: item.drift.x,
                y: item.drift.y,
                rotate: item.drift.rot,
                scale: item.drift.scale,
              }}
              transition={{
                type: "spring",
                ...item.spring,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href={integration.href}
                      aria-label={integration.badge}
                      className="border-border/60 bg-card/80 hover:border-foreground/40 hover:bg-card pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-transform duration-200 hover:scale-110"
                    />
                  }
                >
                  <IntegrationLogo
                    integration={integration}
                    size={28}
                    bgShape="circle"
                  />
                </TooltipTrigger>
                <TooltipContent>{integration.badge}</TooltipContent>
              </Tooltip>
            </motion.div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
