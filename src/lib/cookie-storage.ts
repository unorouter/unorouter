import { deleteCookie, getCookie, setCookie } from "cookies-next/client";

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
