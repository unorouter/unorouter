import { UnwrapApiResponse } from "../types";

type ExtractData<T> = T extends { data: infer D } ? NonNullable<D> : never;

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
