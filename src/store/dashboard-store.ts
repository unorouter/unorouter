import { atom } from "jotai";
import { dayjs } from "@/lib/utils/format/date";

export const DEFAULT_RANGE_HOURS = 24;
const BURN_RATE_WINDOW_DAYS = 7;

// Lives here, not in use-burn-rate: that module is "use client", so the
// dashboard page could not call it to prefetch this exact query key.
export function burnRateWindow() {
  const end = dayjs().endOf("day");
  const start = end.subtract(BURN_RATE_WINDOW_DAYS, "day").startOf("day");
  return { start_timestamp: start.unix(), end_timestamp: end.unix() };
}

export type DashboardStore = {
  startTs: number;
  endTs: number;
};

export function defaultTimestamps() {
  const endTs = dayjs().startOf("minute").unix();
  const startTs = endTs - DEFAULT_RANGE_HOURS * 3600;
  return { startTs, endTs };
}

export const dashboardStoreAtom = atom<DashboardStore>(defaultTimestamps());
