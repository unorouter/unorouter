import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { StoreId } from "@/lib/types/enums";
import { atomWithStorage } from "jotai/utils";

const DEFAULT_RANGE_HOURS = 24;

const to = new Date();
const from = new Date(to);
from.setHours(from.getHours() - DEFAULT_RANGE_HOURS);

export type DashboardStore = {
  from: Date;
  to: Date;
};

export const DASHBOARD_STORE_DEFAULT: DashboardStore = {
  from,
  to,
};

export const dashboardStoreAtom = atomWithStorage<DashboardStore>(
  StoreId.DASHBOARD_STORE,
  DASHBOARD_STORE_DEFAULT,
  jotaiCookieStorage,
);
