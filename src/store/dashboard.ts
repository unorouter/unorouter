import { atom } from "jotai";

const DEFAULT_RANGE_HOURS = 24;

function defaultDateRange() {
  const now = new Date();
  const from = new Date(now);
  from.setHours(from.getHours() - DEFAULT_RANGE_HOURS);
  return { from, to: now };
}

export const dashboardDateRangeAtom = atom(defaultDateRange());
