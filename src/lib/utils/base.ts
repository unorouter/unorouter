import type { UnwrapApiResponse } from "../types";

/**
 * Extract the data field from an Eden treaty response, distributing over unions.
 * Eden returns { data: T; status: number } where T can be a union
 * (e.g. ResponseDto | void for error branches).
 */
type ExtractData<T> = T extends { data: infer D } ? NonNullable<D> : never;

/**
 * Handles an Elysia/Eden treaty response:
 * - Throws on non-200 status
 * - Throws on { success: false } responses
 * - Unwraps { success: true, data: D } → D
 * - Returns direct data as-is
 */
export function handleElysia<T extends { data: unknown; status: number }>(
  response: T,
): UnwrapApiResponse<ExtractData<T>> {
  if (response.status !== 200) throw response;
  const body = response.data;
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    !(body as { success: boolean }).success
  ) {
    throw new Error((body as { message?: string }).message ?? "Request failed");
  }
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    return (body as { data: unknown }).data as UnwrapApiResponse<
      ExtractData<T>
    >;
  }
  return body as UnwrapApiResponse<ExtractData<T>>;
}
