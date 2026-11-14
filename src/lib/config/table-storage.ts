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

// A cookie over about 4KB is dropped by the browser without an error, after
// which no change to the store survives a reload. Fields that grow with use go
// to localStorage; the cookie keeps what the server needs to render.
export function splitCookieStorage<T extends object>(
  localFields: readonly (keyof T)[],
) {
  const readLocal = (key: string): Partial<T> => {
    if (environmentManager.isServer()) return {};
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };
  return {
    readLocal,
    getItem(key: string, initialValue: T): T {
      if (environmentManager.isServer()) return initialValue;
      return {
        ...jotaiCookieStorage.getItem(key, initialValue),
        ...readLocal(key),
      };
    },
    setItem(key: string, value: T) {
      if (environmentManager.isServer()) return;
      const local: Partial<T> = {};
      const rest: Partial<T> = { ...value };
      for (const field of localFields) {
        local[field] = value[field];
        delete rest[field];
      }
      try {
        localStorage.setItem(key, JSON.stringify(local));
        jotaiCookieStorage.setItem(key, rest);
      } catch {
        jotaiCookieStorage.setItem(key, value);
      }
    },
    removeItem(key: string) {
      if (environmentManager.isServer()) return;
      try {
        localStorage.removeItem(key);
      } catch {}
      jotaiCookieStorage.removeItem(key);
    },
  };
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
