import { serverEnv } from "@/server/env";
import { logger } from "@/lib/utils/logger";

type Client = ReturnType<typeof createClient>;

function createClient(url: string) {
  // @ts-expect-error - Bun runtime global, no @types/bun installed
  return new Bun.RedisClient(url) as {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>;
    del(key: string): Promise<number>;
    onclose: ((err?: unknown) => void) | undefined;
  };
}

let _client: Client | null = null;

export function getRedis(): Client {
  if (_client) return _client;
  if (!serverEnv.redisUrl)
    throw new Error("REDIS_URL is required for chat usage tracking");
  _client = createClient(serverEnv.redisUrl);
  _client.onclose = (err) => {
    logger.warn("Redis connection closed", {
      context: "redis",
      error: err ? String(err) : undefined,
    });
    _client = null;
  };
  return _client;
}
