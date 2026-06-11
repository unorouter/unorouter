import { rankingsQuery } from "@/lib/api/typebox/rankings";
import type { RankingsResponse } from "@/lib/api/typebox/rankings";
import { msg, PUBLIC_CACHE } from "@/lib/config/constants";
import { upstreamApiUrl } from "@/server/constants";
import { Elysia } from "elysia";

type UpstreamEnvelope = {
  success: boolean;
  message?: string;
  data?: RankingsResponse;
};

export const rankingsRoute = new Elysia({ prefix: "/rankings" }).get(
  "/",
  async ({ query, request }) => {
    const period = query.period ?? "week";
    const upstreamHeaders: Record<string, string> = {};
    const requestId = request.headers.get("x-request-id");
    if (requestId) upstreamHeaders["x-request-id"] = requestId;

    const res = await fetch(
      `${upstreamApiUrl}/api/rankings?period=${encodeURIComponent(period)}`,
      {
        headers: upstreamHeaders,
        signal: AbortSignal.timeout(10_000),
        ...PUBLIC_CACHE,
      },
    );

    if (!res.ok) {
      throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
    }

    const body = (await res.json()) as UpstreamEnvelope;
    if (!body.success || !body.data) {
      throw new Error(body.message ?? msg("ERRORS.UNEXPECTED_RESPONSE"));
    }

    return body.data;
  },
  { query: rankingsQuery },
);
