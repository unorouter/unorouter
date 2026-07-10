import type { RankingsResponse } from "@/lib/api/typebox/rankings";
import { PUBLIC_CACHE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getRankings } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

export async function fetchRankings(period: string): Promise<RankingsResponse> {
  const res = await getRankings(
    { period },
    { headers: ADMIN_HEADERS, ...PUBLIC_CACHE },
  );
  // The generated client marks the arrays nullable; the upstream contract
  // (validated by the typebox schema) always returns them.
  return unwrap(res).data as RankingsResponse;
}
