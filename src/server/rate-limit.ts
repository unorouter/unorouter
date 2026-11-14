import { msg } from "@/lib/config/constants";
import { getClientIp } from "@/server/constants";
import { connectRedis } from "@/server/redis";
import {
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
} from "rate-limiter-flexible";

let redis: ReturnType<typeof connectRedis> | undefined;

// Counted in Redis so the limit holds across pods; a pod counts in its own
// memory while Redis is unreachable, and always in dev (no Sentinels).
export function rateLimit(name: string, limit: number, windowMs = 60_000) {
  const duration = Math.ceil(windowMs / 1000);
  redis ??= connectRedis({ offlineQueue: false });
  const memory = new RateLimiterMemory({
    keyPrefix: `rl:${name}`,
    points: limit,
    duration,
  });
  const limiter = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `uno:rl:${name}`,
        points: limit,
        duration,
        insuranceLimiter: memory,
        inMemoryBlockOnConsumed: limit,
      })
    : memory;
  return async ({
    request,
  }: {
    request: Request;
  }): Promise<Response | undefined> => {
    try {
      await limiter.consume(getClientIp(request.headers) ?? "unknown");
      return;
    } catch (rejected) {
      if (!(rejected instanceof RateLimiterRes)) throw rejected;
      return new Response(
        JSON.stringify({ error: msg("ERRORS.RATE_LIMITED") }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": String(Math.ceil(rejected.msBeforeNext / 1000)),
          },
        },
      );
    }
  };
}
