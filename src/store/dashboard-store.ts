import { atom } from "jotai";
import dayjs from "dayjs";

export const DEFAULT_RANGE_HOURS = 24;

/** Unix seconds, rounded down to the minute. */
export type DashboardStore = {
  startTs: number;
  endTs: number;
};

/** Default timestamps rounded to the current minute so server and client produce identical values. */
export function defaultTimestamps() {
  const endTs = dayjs().startOf("minute").unix();
  const startTs = endTs - DEFAULT_RANGE_HOURS * 3600;
  return { startTs, endTs };
}

export const dashboardStoreAtom = atom<DashboardStore>(defaultTimestamps());
