import type { StoreId } from "@/lib/types/enums";
import { isServer } from "@tanstack/react-query";
import type { TableState } from "@tanstack/react-table";
import type { TableFeats } from "./table-features";
import { deleteCookie, getCookie, setCookie } from "cookies-next/client";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { COOKIE_MAX_AGE } from "./constants";

// Server-guarded because `cookies-next/client` THROWS off the client rather than
// returning empty, and `getOnInit` atoms call getItem during the server render too.
// Server-side reads yield the initial value; the real cookie is seeded into those
// atoms by the store providers, which read it through `getCookieValue`.
export const jotaiCookieStorage = {
  getItem(key: string, initialValue: unknown) {
    if (isServer) return initialValue;
    const value = getCookie(key);
    if (!value) return initialValue;
    try {
      return JSON.parse(String(value));
    } catch {
      return initialValue;
    }
  },
  setItem(key: string, value: unknown) {
    if (isServer) return;
    setCookie(key, JSON.stringify(value), { maxAge: COOKIE_MAX_AGE });
  },
  removeItem(key: string) {
    if (isServer) return;
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
  const savedState = isServer ? cookie?.get(id)?.value : getCookie(id);

  return savedState ? JSON.parse(savedState) : undefined;
};
