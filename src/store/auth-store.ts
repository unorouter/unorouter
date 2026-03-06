import { AUTH_USER_ID_COOKIE } from "@/lib/config/constants";
import { jotaiCookieStorage } from "@/lib/cookie-storage";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export interface AuthUser {
  id: number;
  username: string;
  display_name: string;
  role: number;
  status: number;
  group: string;
}

export const userIdAtom = atomWithStorage<number | null>(
  AUTH_USER_ID_COOKIE,
  null,
  jotaiCookieStorage,
);

export const userAtom = atom<AuthUser | null>(null);
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null);
export const isLoadingAuthAtom = atom(true);
