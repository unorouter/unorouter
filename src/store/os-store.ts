import { atom } from "jotai";

export type OS = "windows" | "macos" | "linux";

export const osAtom = atom<OS | undefined>(undefined);
