import { jotaiCookieStorage } from "@/lib/config/table-storage";
import type { StatusBucket } from "@/hooks/use-model-status-hook";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type StatusFilter = "all" | "success" | "degraded" | "error" | "empty";

export type StatusStoreState = {
  bucket: StatusBucket;
  statusFilter: StatusFilter;
};

export const STATUS_STORE_KEY = "status-store";

export const INITIAL_STATUS_STATE: StatusStoreState = {
  bucket: "1m",
  statusFilter: "all",
};

export const statusStoreAtom = atomWithStorage<StatusStoreState>(
  STATUS_STORE_KEY,
  INITIAL_STATUS_STATE,
  jotaiCookieStorage,
);

export const statusBucketAtom = atom(
  (get) => get(statusStoreAtom).bucket ?? INITIAL_STATUS_STATE.bucket,
  (get, set, value: StatusBucket) => {
    const state = get(statusStoreAtom);
    set(statusStoreAtom, { ...state, bucket: value });
  },
);

export const statusFilterAtom = atom(
  (get) =>
    get(statusStoreAtom).statusFilter ?? INITIAL_STATUS_STATE.statusFilter,
  (get, set, value: StatusFilter) => {
    const state = get(statusStoreAtom);
    set(statusStoreAtom, { ...state, statusFilter: value });
  },
);
