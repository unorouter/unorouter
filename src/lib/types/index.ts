import type { Static } from "@sinclair/typebox/type";
import type { paginationQuery } from "@/lib/typebox/common";

/**
 * Unwraps API response types that may be:
 * 1. Wrapped: { success: boolean; message: string; data: D } → D
 * 2. Direct: T (no wrapper) → T
 *
 * Distributes over unions so { success, data: D } | void → D | void
 * then NonNullable strips void/null/undefined.
 */
export type UnwrapApiResponse<T> = NonNullable<
  T extends { success: boolean; data: infer D } ? D : T
>;

export type PaginationParams = Partial<Static<typeof paginationQuery>>;
