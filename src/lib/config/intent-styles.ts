export type IntentType =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "ongoing";

/** Semantic Tailwind classes for an intent-tagged badge (small pill).
 *  Centralized so green/yellow/red/blue shades stay consistent. */
const INTENT_BADGE_CLASS: Record<IntentType, string> = {
  success: "bg-green-500/10 text-green-500",
  warning: "bg-yellow-500/10 text-yellow-500",
  error: "bg-red-500/10 text-red-500",
  info: "bg-blue-500/10 text-blue-500",
  ongoing: "bg-blue-500/10 text-blue-500",
};

const NEUTRAL_BADGE_CLASS = "bg-muted text-muted-foreground";

export function intentBadgeClass(type: string | undefined): string {
  if (!type) return NEUTRAL_BADGE_CLASS;
  return INTENT_BADGE_CLASS[type as IntentType] ?? NEUTRAL_BADGE_CLASS;
}

/** Tinted background (low opacity) + solid dot color per intent. Used for
 *  status indicator dots (e.g. uptime monitor rows). */
const INTENT_DOT_CLASS: Record<IntentType, { bg: string; dot: string }> =
  {
    success: { bg: "bg-green-500/10", dot: "bg-green-500" },
    warning: { bg: "bg-yellow-500/10", dot: "bg-yellow-500" },
    error: { bg: "bg-red-500/10", dot: "bg-red-500" },
    info: { bg: "bg-blue-500/10", dot: "bg-blue-500" },
    ongoing: { bg: "bg-blue-500/10", dot: "bg-blue-500" },
  };

const NEUTRAL_DOT_CLASS = { bg: "bg-muted", dot: "bg-muted-foreground" };

export function intentDotClass(intent: IntentType | undefined): {
  bg: string;
  dot: string;
} {
  if (!intent) return NEUTRAL_DOT_CLASS;
  return INTENT_DOT_CLASS[intent] ?? NEUTRAL_DOT_CLASS;
}
