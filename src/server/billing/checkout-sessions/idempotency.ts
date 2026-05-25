import { getDb } from "@/lib/db/server/client";
import { acpIdempotencyKeys } from "@/lib/db/schema";
import type { Cookie } from "elysia";
import { and, eq, lt } from "drizzle-orm";
import { acpError } from "./errors";

export type AcpIdempotencyState = "in_flight" | "done";

const KEY_RETENTION_MS = 24 * 60 * 60 * 1000;

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) sorted[k] = sortKeys(obj[k]);
  return sorted;
}

function canonicalize(body: unknown): string {
  return JSON.stringify(sortKeys(body ?? {}));
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type _IdempotentResult<T> = {
  status: number;
  body: T;
  replayed: boolean;
};

// Mirrors Elysia's `set` shape: HTTPHeaders is Record<string, string | number>.
type SetLike = {
  status?: number | string;
  headers: Record<string, string | number>;
};

export function readIdempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key");
  if (!key) {
    throw acpError(400, {
      type: "invalid_request",
      code: "idempotency_key_required",
      message: "Idempotency-Key header is required on all POST requests",
    });
  }
  if (key.length > 255) {
    throw acpError(400, {
      type: "invalid_request",
      code: "invalid",
      message: "Idempotency-Key exceeds 255 characters",
    });
  }
  return key;
}

function setHeader(set: SetLike, name: string, value: string) {
  set.headers[name] = value;
}

export async function withIdempotency<T>(
  args: {
    userId: number;
    key: string;
    body: unknown;
    request: Request;
    set: SetLike;
    cookie?: Record<string, Cookie<unknown>>;
  },
  fn: () => Promise<{ status: number; body: T }>,
): Promise<T> {
  const db = getDb();
  // Derive path from the actual request so callers can't accidentally reuse
  // the same idempotency key across different routes.
  const url = new URL(args.request.url);
  const path = `${args.request.method} ${url.pathname}`;
  const bodyHash = await sha256Hex(canonicalize(args.body));

  // Sweep stale keys lazily on read; cheap on indexed createdAt.
  const cutoff = new Date(Date.now() - KEY_RETENTION_MS);
  await db
    .delete(acpIdempotencyKeys)
    .where(lt(acpIdempotencyKeys.createdAt, cutoff));

  const existing = await db
    .select()
    .from(acpIdempotencyKeys)
    .where(
      and(
        eq(acpIdempotencyKeys.userId, args.userId),
        eq(acpIdempotencyKeys.key, args.key),
        eq(acpIdempotencyKeys.path, path),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    if (row.bodyHash !== bodyHash) {
      throw acpError(422, {
        type: "invalid_request",
        code: "idempotency_conflict",
        message:
          "Idempotency-Key has already been used with a different request body",
      });
    }
    if (row.state === "in_flight") {
      setHeader(args.set, "Retry-After", "1");
      throw acpError(409, {
        type: "invalid_request",
        code: "idempotency_in_flight",
        message:
          "A request with this Idempotency-Key is currently being processed",
      });
    }
    setHeader(args.set, "Idempotent-Replayed", "true");
    args.set.status = row.status;
    return row.response as T;
  }

  await db.insert(acpIdempotencyKeys).values({
    userId: args.userId,
    key: args.key,
    path: path,
    bodyHash,
    status: 0,
    response: {},
    state: "in_flight",
  });

  try {
    const result = await fn();
    await db
      .update(acpIdempotencyKeys)
      .set({
        status: result.status,
        response: result.body as object,
        state: "done",
      })
      .where(
        and(
          eq(acpIdempotencyKeys.userId, args.userId),
          eq(acpIdempotencyKeys.key, args.key),
          eq(acpIdempotencyKeys.path, path),
        ),
      );
    args.set.status = result.status;
    return result.body;
  } catch (err) {
    // Drop in-flight key on throw so retries are fresh (sec6.5). 4xx also dropped; agents retry.
    await db
      .delete(acpIdempotencyKeys)
      .where(
        and(
          eq(acpIdempotencyKeys.userId, args.userId),
          eq(acpIdempotencyKeys.key, args.key),
          eq(acpIdempotencyKeys.path, path),
        ),
      );
    throw err;
  }
}
