import { Elysia } from "elysia";
import { readFileSync } from "fs";
import { join } from "path";

export const searchRoute = new Elysia({ prefix: "/search" }).get(
  "",
  ({ set }) => {
    try {
      const filePath = join(process.cwd(), "public", "search-index.json");
      const data = readFileSync(filePath, "utf-8");
      set.headers["content-type"] = "application/json";
      return new Response(data);
    } catch {
      set.status = 404;
      return "Search index not found";
    }
  },
);
