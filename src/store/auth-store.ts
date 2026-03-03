import { atom } from "jotai";

export interface AuthUser {
  id: number;
  username: string;
  display_name: string;
  role: number;
  status: number;
  group: string;
}

export const userAtom = atom<AuthUser | null>(null);
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null);
export const isLoadingAuthAtom = atom(true);
