import { isServer } from "@tanstack/react-query";
import type { TableState } from "@tanstack/react-table";
import { deleteCookie, getCookie, setCookie } from "cookies-next/client";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { StoreId } from "@/lib/types/enums";

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const jotaiCookieStorage = {
  getItem(key: string, initialValue: unknown) {
    const value = getCookie(key);
    if (!value) return initialValue;
    try {
      return JSON.parse(String(value));
    } catch {
      return initialValue;
    }
  },
  setItem(key: string, value: unknown) {
    setCookie(key, JSON.stringify(value), { maxAge: MAX_AGE });
  },
  removeItem(key: string) {
    deleteCookie(key);
  },
};

export const initialTableStore = (overrides?: Partial<TableState>) =>
  ({
    globalFilter: undefined,
    rowSelection: {},
    columnVisibility: {},
    columnFilters: [],
    sorting: [],
    pagination: { pageIndex: 0, pageSize: 10 },
    ...overrides,
  }) satisfies Partial<TableState>;

export const loadDataFromCookie = <T = TableState>(
  id: StoreId,
  cookie?: ReadonlyRequestCookies,
): T | undefined => {
  const savedState = isServer ? cookie?.get(id)?.value : getCookie(id);

  return savedState ? JSON.parse(savedState) : undefined;
};
