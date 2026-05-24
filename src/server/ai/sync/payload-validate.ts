import { logger } from "@/lib/utils/logger";
import { Value } from "@sinclair/typebox/value";
import type { TSchema, Static } from "@sinclair/typebox";

// Wraps Value.Cast with a sibling drift-log so schema mismatches surface in
// observability instead of being silently coerced.
//
// Use this for every sync POST payload + every import path that consumes
// untrusted JSON. `context` identifies the call site in logs.
export function castWithDriftLog<T extends TSchema>(
  schema: T,
  payload: unknown,
  context: string,
): Static<T> {
  const errors = [...Value.Errors(schema, payload)];
  if (errors.length > 0) {
    logger.warn("sync schema drift", {
      context,
      errorCount: errors.length,
      // First 5 errors give enough signal to debug without log spam.
      sample: errors.slice(0, 5).map((e) => ({
        path: e.path,
        message: e.message,
      })),
    });
  }
  return Value.Cast(schema, payload);
}
