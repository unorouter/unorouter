import type { BlogCategory } from "@/lib/types";
import { atom } from "jotai";

type BlogCategoryFilter = "all" | BlogCategory;

export const blogSearchAtom = atom("");
export const blogCategoryAtom = atom<BlogCategoryFilter>("all");

export const blogClearFiltersAtom = atom(null, (_get, set) => {
  set(blogSearchAtom, "");
  set(blogCategoryAtom, "all");
});
