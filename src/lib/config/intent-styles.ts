export type IntentType = "success" | "warning" | "error" | "info" | "ongoing";

const INTENT_BADGE_CLASS: Record<IntentType, string> = {
  success: "bg-green-500/10 text-green-500",
  warning: "bg-yellow-500/10 text-yellow-500",
  error: "bg-red-500/10 text-red-500",
  info: "bg-blue-500/10 text-blue-500",
  ongoing: "bg-blue-500/10 text-blue-500",
};

const NEUTRAL_BADGE_CLASS = "bg-muted text-muted-foreground";

const isIntentType = (v: string): v is IntentType => v in INTENT_BADGE_CLASS;

export function intentBadgeClass(type: string | undefined): string {
  if (!type || !isIntentType(type)) return NEUTRAL_BADGE_CLASS;
  return INTENT_BADGE_CLASS[type];
}

const INTENT_DOT_CLASS: Record<IntentType, { bg: string; dot: string }> = {
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
