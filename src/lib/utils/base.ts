import { UnwrapApiResponse } from "../types";

export function handleElysia<D, T extends { data: D; status: number }>(
  response: T,
): UnwrapApiResponse<NonNullable<D>> {
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
      NonNullable<T["data"]>
    >;
  }
  return body as UnwrapApiResponse<NonNullable<T["data"]>>;
}
