import { benchmarksQuery } from "@/lib/api/typebox/benchmarks";
import { getBenchmarks } from "./benchmarks.service";
import { Elysia } from "elysia";

export const benchmarksRoute = new Elysia({ prefix: "/benchmarks" }).get(
  "/",
  async ({ query }) => {
    return getBenchmarks(query.model);
  },
  { query: benchmarksQuery },
);
