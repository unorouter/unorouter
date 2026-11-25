import { unwrap } from "@/lib/utils/base";
import { getPerfMetricsSummary } from "@/openapi";

export async function fetchPerfSummary(hours = 24) {
  const res = await getPerfMetricsSummary({ hours });
  return unwrap(res).data;
}

export type WeeklyModelStats = {
  successRate: number;
  ttftMs: number;
  tps: number;
  requests: number;
};

// The 7 day summary is about 1.3 MB with its series and takes over a second, so
// every model page render shares one trimmed copy per process.
const WEEK_TTL_MS = 15 * 60 * 1000;
let week: { at: number; data: Promise<Map<string, WeeklyModelStats>> } | null =
  null;

function loadWeek() {
  return fetchPerfSummary(168).then(
    (summary) =>
      new Map(
        (summary.models ?? []).map((m) => [
          m.model_name,
          {
            successRate: m.success_rate,
            ttftMs: m.avg_ttft_ms,
            tps: m.avg_tps,
            requests: m.request_count,
          },
        ]),
      ),
  );
}

export async function getWeeklyModelStats(model: string) {
  if (!week || Date.now() - week.at > WEEK_TTL_MS) {
    const data = loadWeek();
    week = { at: Date.now(), data };
    // A failed load must not stick for the whole TTL.
    data.catch(() => {
      if (week?.data === data) week = null;
    });
  }
  const stats = await week.data.catch(() => null);
  return stats?.get(model) ?? null;
}
