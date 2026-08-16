import { computeStatsSummary } from "@/server/ops/stats/stats.service";
import { Elysia } from "elysia";

export const statsRoute = new Elysia({ prefix: "/stats" }).get("/history", () =>
  computeStatsSummary(),
);
