import type { StoreId } from "@/lib/types/enums";
import { isServer } from "@tanstack/react-query";
import type { TableState } from "@tanstack/react-table";
import { deleteCookie, getCookie, setCookie } from "cookies-next/client";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import {
  COOKIE_MAX_AGE,
  GUEST_CONVS_COOKIE,
  GUEST_CONVS_MAX_AGE,
} from "./constants";

const COOKIE_MAX_AGE_BY_KEY: Record<string, number> = {
  [GUEST_CONVS_COOKIE]: GUEST_CONVS_MAX_AGE,
};

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
    const maxAge = COOKIE_MAX_AGE_BY_KEY[key] ?? COOKIE_MAX_AGE;
    setCookie(key, JSON.stringify(value), { maxAge });
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
