import { msg } from "@/lib/config/constants";
import { getClientIp } from "@/server/constants";

const MAX_KEYS = 10_000;

type Window = { count: number; resetAt: number };

// Fixed window per client IP, held per pod: the cluster allows limit times the
// replica count.
export function rateLimit(limit: number, windowMs = 60_000) {
  const hits = new Map<string, Window>();
  return ({ request }: { request: Request }): Response | undefined => {
    const now = Date.now();
    const key = getClientIp(request.headers) ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.delete(key);
      if (hits.size >= MAX_KEYS) evict(hits, now);
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count <= limit) return;
    return new Response(JSON.stringify({ error: msg("ERRORS.RATE_LIMITED") }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.ceil((entry.resetAt - now) / 1000)),
      },
    });
  };
}

function evict(hits: Map<string, Window>, now: number) {
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
  // Map order is window start order, so what remains goes oldest first.
  for (const key of hits.keys()) {
    if (hits.size < MAX_KEYS) break;
    hits.delete(key);
  }
}
