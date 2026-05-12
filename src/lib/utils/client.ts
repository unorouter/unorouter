import type { TranslationKey } from "@/lib/config/constants";
import {
  DefaultErrorFunction,
  SetErrorFunction,
} from "@sinclair/typebox/errors";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

SetErrorFunction((error) => {
  if (typeof error.schema.error === "string") return error.schema.error;
  return DefaultErrorFunction(error);
});

// Server errors are serialized as strings (see Elysia .onError). Pull out a
// usable message whether the body is `{ message }`, an array of field errors,
// or an array of primitives.
function extractMessageFromJson(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const m = (parsed as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === "string") return item;
        if (
          item &&
          typeof item === "object" &&
          typeof (item as { message?: unknown }).message === "string"
        ) {
          return (item as { message: string }).message;
        }
      }
    }
  } catch {
    // not JSON
  }
  return null;
}

export async function handleError(
  e: unknown,
  t?: ReturnType<typeof useTranslations<never>>,
  toastId?: string,
) {
  let message = "";

  if (e instanceof Error) {
    message = e.message;
    // The `ai` SDK surfaces failed stream responses as Error(bodyText); unwrap
    // the JSON envelope so `{ "message": "ERRORS.X" }` becomes "ERRORS.X".
    if (message.startsWith("{") || message.startsWith("[")) {
      const extracted = extractMessageFromJson(message);
      if (extracted) message = extracted;
    }
  } else if (e !== null && typeof e === "object") {
    if (
      "data" in e &&
      e.data !== null &&
      typeof e.data === "object" &&
      "message" in e.data
    ) {
      message = String((e.data as Record<string, unknown>).message);
    } else if ("data" in e && typeof e.data === "string") {
      message = e.data;
    } else if ("response" in e && e.response instanceof Response) {
      const body = await e.response
        .clone()
        .json()
        .catch(() => null);
      if (body && typeof body === "object" && "message" in body) {
        message = String(body.message);
      }
    }
  }

  if (!message) message = "ERRORS.UNEXPECTED_ERROR";

  const title =
    t && t.has(message as TranslationKey)
      ? t(message as TranslationKey)
      : message;

  toast.error(title, { duration: 5000, id: toastId });
}

/**
 * Factory for mutation hooks that only need mutationFn + onError toast.
 * For mutations with onSuccess cache logic, use useMutation directly.
 */
export function useSimpleMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
) {
  const t = useTranslations();
  return useMutation({
    mutationFn,
    onError: (e) => handleError(e, t),
  });
}
