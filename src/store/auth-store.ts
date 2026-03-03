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
  "uno_user_id",
  null,
  jotaiCookieStorage,
);

export const userAtom = atom<AuthUser | null>(null);
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null);
export const isLoadingAuthAtom = atom(true);
