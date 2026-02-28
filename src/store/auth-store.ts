import { atom, createStore } from "jotai";

export const tokenAtom = atom<string | null | undefined>(null);

export const authStore = createStore();
export const getToken = () => authStore.get(tokenAtom);
export const setToken = (token?: string | null) =>
  authStore.set(tokenAtom, token);
export const clearToken = () => setToken(null);
