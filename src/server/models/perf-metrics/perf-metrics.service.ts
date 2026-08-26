import { unwrap } from "@/lib/utils/base";
import { getPerfMetricsSummary } from "@/openapi";

export async function fetchPerfSummary(hours = 24) {
  const res = await getPerfMetricsSummary({ hours });
  return unwrap(res).data;
}
