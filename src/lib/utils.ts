import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleElysia<T extends { data: unknown; status: number }>(
  response: T,
): T["data"] {
  if (response.status === 200) return response.data as T["data"];
  throw response;
}
