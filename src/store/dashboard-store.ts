import type { rpc } from "@/lib/rpc";
import type { EdenQuery } from "@/lib/types/eden";
import { dayjs } from "@/lib/utils/format/date";
import { atom } from "jotai";

export const DEFAULT_RANGE_HOURS = 24;
export const BURN_RATE_WINDOW_DAYS = 7;

export type TimeRange = Required<
  EdenQuery<typeof rpc.api.billing.dashboard.quota>
>;

export function burnRateWindow(days = BURN_RATE_WINDOW_DAYS): TimeRange {
  const end = dayjs().endOf("day");
  const start = end.subtract(days - 1, "day").startOf("day");
  return { start_timestamp: start.unix(), end_timestamp: end.unix() };
}

export function defaultTimestamps(hours = DEFAULT_RANGE_HOURS): TimeRange {
  const end = dayjs().startOf("minute").unix();
  return { start_timestamp: end - hours * 3600, end_timestamp: end };
}

export const dashboardStoreAtom = atom<TimeRange>(defaultTimestamps());
