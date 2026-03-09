import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { StoreId } from "@/lib/types/enums";
import { atomWithStorage } from "jotai/utils";

export const DEFAULT_RANGE_HOURS = 24;

/** Unix seconds, rounded down to the minute. */
export type DashboardStore = {
  startTs: number;
  endTs: number;
};

/** Default timestamps rounded to the current minute so server and client produce identical values. */
export function defaultTimestamps() {
  const endTs = Math.floor(Date.now() / 60_000) * 60;
  const startTs = endTs - DEFAULT_RANGE_HOURS * 3600;
  return { startTs, endTs };
}

export const dashboardStoreAtom = atomWithStorage<DashboardStore | null>(
  StoreId.DASHBOARD_STORE,
  null,
  jotaiCookieStorage,
);
