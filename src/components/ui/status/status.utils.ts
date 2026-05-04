import type { StatusType } from "@/components/ui/status/status.types";

/**
 * Formats a date with locale support.
 */
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

/**
 * Formats a date with abbreviated month (e.g. "Jan 15, 2024").
 */
export function formatDateShort(date: Date, locale = "en-US") {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a date with time, with locale support.
 */
export function formatDateTime(date: Date, locale = "en-US") {
  return date.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

/**
 * Formats a time with locale support.
 */
export function formatTime(date: Date, locale = "en-US") {
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "numeric",
  });
}

/**
 * CSS variable mappings for status colors. Maps StatusType to corresponding
 * CSS custom properties.
 */
export const statusColors: Record<StatusType, string> = {
  success: "var(--success)",
  degraded: "var(--warning)",
  error: "var(--destructive)",
  info: "var(--info)",
  empty: "var(--muted)",
} as const;
