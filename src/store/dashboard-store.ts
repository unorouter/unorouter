import { atom } from "jotai";
import { dayjs } from "@/lib/utils/format/date";

export const DEFAULT_RANGE_HOURS = 24;

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
