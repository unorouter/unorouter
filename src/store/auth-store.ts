import "server-only";
import { atom, createStore } from "jotai";

export const isLoggedInAtom = atom(false);

export const authStore = createStore();
export const getIsLoggedIn = () => authStore.get(isLoggedInAtom);
export const setIsLoggedIn = (value: boolean) =>
  authStore.set(isLoggedInAtom, value);
