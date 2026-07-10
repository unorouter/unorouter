import {
  computeStatsSummary,
  type HistorySummary,
} from "@/server/ops/stats/stats.service";
import { Elysia } from "elysia";

const SUMMARY_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; value: HistorySummary } | null = null;

export const statsRoute = new Elysia({ prefix: "/stats" }).get(
  "/history",
  async () => {
    if (cached && Date.now() - cached.at < SUMMARY_TTL_MS) return cached.value;
    const value = await computeStatsSummary();
    cached = { at: Date.now(), value };
    return value;
  },
);
