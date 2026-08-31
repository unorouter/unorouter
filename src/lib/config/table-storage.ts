import type { StoreId } from "@/lib/types/enums";
import { environmentManager } from "@tanstack/react-query";
import type { TableState } from "@tanstack/react-table";
import type { TableFeats } from "./table-features";
import { deleteCookie, getCookie, setCookie } from "cookies-next/client";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { COOKIE_MAX_AGE } from "./constants";
import { atom, type PrimitiveAtom } from "jotai";

export function storeFieldAtom<S extends object, K extends keyof S>(
  storeAtom: PrimitiveAtom<S>,
  initial: S,
  key: K,
  normalize?: (v: S[K]) => S[K],
) {
  return atom(
    (get) => {
      const v = get(storeAtom)[key] ?? initial[key];
      return normalize ? normalize(v) : v;
    },
    (get, set, value: S[K]) => {
      set(storeAtom, { ...get(storeAtom), [key]: value });
    },
  );
}

export const jotaiCookieStorage = {
  getItem<T>(key: string, initialValue: T): T {
    if (environmentManager.isServer()) return initialValue;
    const value = getCookie(key);
    if (!value) return initialValue;
    try {
      return JSON.parse(String(value));
    } catch {
      return initialValue;
    }
  },
  setItem(key: string, value: unknown) {
    if (environmentManager.isServer()) return;
    setCookie(key, JSON.stringify(value), { maxAge: COOKIE_MAX_AGE });
  },
  removeItem(key: string) {
    if (environmentManager.isServer()) return;
    deleteCookie(key);
  },
};

export const initialTableStore = (
  overrides?: Partial<TableState<TableFeats>>,
) =>
  ({
    globalFilter: undefined,
    rowSelection: {},
    columnVisibility: {},
    columnFilters: [],
    sorting: [],
    pagination: { pageIndex: 0, pageSize: 10 },
    ...overrides,
  }) satisfies Partial<TableState<TableFeats>>;

export const loadDataFromCookie = <T = TableState<TableFeats>>(
  id: StoreId,
  cookie?: ReadonlyRequestCookies,
): T | undefined => {
  const savedState = environmentManager.isServer()
    ? cookie?.get(id)?.value
    : getCookie(id);

  return savedState ? JSON.parse(savedState) : undefined;
};
