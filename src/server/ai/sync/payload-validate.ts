import { logger } from "@/lib/utils/logger";
import { Value } from "@sinclair/typebox/value";
import type { TSchema, Static } from "@sinclair/typebox";

// Value.Cast with a drift-log when the payload doesn't match the schema.
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
      sample: errors.slice(0, 5).map((e) => ({
        path: e.path,
        message: e.message,
      })),
    });
  }
  return Value.Cast(schema, payload);
}
