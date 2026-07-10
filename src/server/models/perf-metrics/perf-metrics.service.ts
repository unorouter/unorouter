import { PUBLIC_CACHE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getPerfMetricsSummary } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

export async function fetchPerfSummary(hours = 24) {
  const res = await getPerfMetricsSummary(
    { hours },
    { headers: ADMIN_HEADERS, ...PUBLIC_CACHE },
  );
  return unwrap(res).data;
}
