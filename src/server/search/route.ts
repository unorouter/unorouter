import { Elysia } from "elysia";
import { readFileSync } from "fs";
import { join } from "path";

let cachedIndex: unknown = null;

export const searchRoute = new Elysia({ prefix: "/search" }).get(
  "",
  ({ set }) => {
    try {
      if (!cachedIndex) {
        const filePath = join(process.cwd(), "public", "search-index.json");
        cachedIndex = JSON.parse(readFileSync(filePath, "utf-8"));
      }
      return cachedIndex;
    } catch {
      set.status = 404;
      return "Search index not found";
    }
  },
);
