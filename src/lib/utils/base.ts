import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UnwrapApiResponse } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleElysia<T extends { data: unknown; status: number }>(
  response: T,
): UnwrapApiResponse<NonNullable<T["data"]>> {
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
