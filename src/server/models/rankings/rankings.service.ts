import type { RankingsResponse } from "@/lib/api/typebox/rankings";
import { unwrap } from "@/lib/utils/base";
import { getRankings } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

export async function fetchRankings(period: string): Promise<RankingsResponse> {
  const res = await getRankings(
    { period },
    { headers: ADMIN_HEADERS },
  );
  // The generated client marks the arrays nullable; the upstream contract
  // (validated by the typebox schema) always returns them.
  return unwrap(res).data as RankingsResponse;
}
