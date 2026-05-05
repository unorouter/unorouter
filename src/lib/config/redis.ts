import { logger } from "@/lib/utils/logger";
import Redis from "ioredis";

// ioredis works under both Bun (prod) and Node (Next.js dev / build).
// Lazy singleton so the connection isn't opened during build-time module eval.
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  _redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3 });
  _redis.on("error", (err) => {
    logger.warn("Redis error", { context: "redis", err: String(err) });
  });
  return _redis;
}
