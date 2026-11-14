import { serverEnv } from "@/server/env";
import Redis from "ioredis";

// The gateway's Redis behind Sentinel (384mb, volatile-lru): only keys with a
// TTL belong here. Null without Sentinels configured (dev).
export function connectRedis(opts: { offlineQueue: boolean }): Redis | null {
  if (!serverEnv.redisSentinels) return null;
  const sentinels = serverEnv.redisSentinels.split(",").map((addr) => {
    const [host, port] = addr.trim().split(":");
    return { host, port: Number(port) || 26379 };
  });
  return new Redis({
    sentinels,
    name: serverEnv.redisMasterName,
    enableOfflineQueue: opts.offlineQueue,
    maxRetriesPerRequest: 1,
    lazyConnect: false,
  }).on("error", () => {});
}
