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

/** Long date format: "Sep 21, 2024". Accepts ISO strings or unix seconds.
 *  Empty/invalid input returns "" (or the raw string when it's a non-parseable string). */
export function formatLongDate(value: string | number | undefined): string {
  if (!value) return "";
  const d = typeof value === "number" ? dayjs.unix(value) : dayjs(value);
  if (!d.isValid()) return typeof value === "string" ? value : "";
  return d.format("MMM D, YYYY");
}

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

export type Granularity = "hour" | "day" | "week";

/** Pick a time-bucket granularity based on the visible period in minutes.
 *  <= 48h -> hour, <= 60d -> day, else week. */
export function pickGranularity(periodMinutes: number): Granularity {
  if (periodMinutes <= 60 * 48) return "hour";
  if (periodMinutes <= 60 * 24 * 60) return "day";
  return "week";
}

/** Bucket label for a unix-seconds timestamp at the given granularity. */
export function bucketKey(tsSeconds: number, g: Granularity): string {
  const d = dayjs.unix(tsSeconds);
  if (g === "hour") return d.format("MM/DD HH:00");
  if (g === "week") return d.startOf("week").format("YYYY/MM/DD");
  return d.format("MM/DD");
}
