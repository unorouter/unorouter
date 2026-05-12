import { msg } from "@/lib/config/constants";

/**
 * Assert that a Drizzle query result returned at least one row, throwing the
 * canonical NOT_FOUND error otherwise. The 50+ ownership/select-and-throw
 * sites in `src/server/chat/**` all reduce to this one-liner.
 */
export function assertFound<T>(
  rows: ArrayLike<T>,
): asserts rows is { 0: T } & ArrayLike<T> {
  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
}
