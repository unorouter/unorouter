import dayjs from "dayjs";
import "dayjs/locale/de";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

/**
 * Side-effect: extend the shared dayjs singleton with plugins.
 * Import this module once at the server entry (instrumentation.ts)
 * and once at the client entry (root layout) to activate plugins
 * for every `import dayjs from "dayjs"` across the app.
 */
dayjs.extend(relativeTime);
dayjs.extend(utc);

export type { Dayjs } from "dayjs";
export { dayjs };

/** "2024-09" -> "Sep 2024"; "2024" -> "2024"; invalid -> raw value; missing -> null. */
export function formatYearMonth(value: string | undefined): string | null {
  if (!value) return null;
  const d = dayjs(value);
  if (!d.isValid()) return value;
  return d.format(value.includes("-") ? "MMM YYYY" : "YYYY");
}

/** Compact hours -> "24h" or "Nd" when a whole-day multiple. */
export function formatHoursLabel(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}d`;
  return `${hours}h`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isStartOfDay(d: Date): boolean {
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
}

export function isEndOfDay(d: Date): boolean {
  return d.getHours() === 23 && d.getMinutes() === 59 && d.getSeconds() === 59;
}
