import type { StatusType } from "@/components/ui/status/status.types";

export function formatDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
  locale = "en-US",
) {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
}

export function formatDateShort(date: Date, locale = "en-US") {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date, locale = "en-US") {
  return date.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

export function formatTime(date: Date, locale = "en-US") {
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "numeric",
  });
}

export const statusColors: Record<StatusType, string> = {
  success: "var(--success)",
  degraded: "var(--warning)",
  error: "var(--destructive)",
  info: "var(--info)",
  empty: "var(--muted)",
} as const;
