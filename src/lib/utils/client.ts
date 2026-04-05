import type { TranslationKey } from "@/lib/config/constants";
import type { TypeCompiler } from "@sinclair/typebox/compiler";
import {
  DefaultErrorFunction,
  SetErrorFunction,
} from "@sinclair/typebox/errors";
import type { Static, TSchema } from "@sinclair/typebox/type";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

SetErrorFunction((error) => {
  if (typeof error.schema.error === "string") return error.schema.error;
  return DefaultErrorFunction(error);
});

export async function handleError(
  e: unknown,
  t?: ReturnType<typeof useTranslations<never>>,
  toastId?: string,
) {
  let message = "";

  if (e instanceof Error) {
    message = e.message;
  } else if (e && typeof e === "object") {
    const obj = e as { data?: unknown; response?: Response };
    if (obj.data && typeof obj.data === "object" && "message" in obj.data) {
      message = String((obj.data as { message: unknown }).message);
    } else if (typeof obj.data === "string") {
      message = obj.data;
    } else if (obj.response) {
      const body = await obj.response.clone().json().catch(() => null);
      if (body?.message) message = body.message;
    }
  }

  if (!message) message = "An unexpected error occurred";

  let title = "";
  try {
    title = t ? t(message as TranslationKey) : message;
  } catch {
    title = message;
  }

  toast.error(title, { duration: 5000, id: toastId });
}

/**
 * Safe parsing utility for TypeBox schemas that returns a discriminated union result
 * rather than throwing errors. Similar to Zod's safeParse pattern.
 *
 * @param checker A compiled TypeBox schema checker
 * @param value The value to validate
 * @returns An object with either:
 * - {success: true, data: validatedValue} if validation succeeds
 * - {success: false, errors: [{message: string}]} if validation fails
 */
export function safeParse<T extends TSchema>(
  checker: ReturnType<typeof TypeCompiler.Compile<T>>,
  value: Partial<Static<T>>,
):
  | { success: true; data: Static<T> }
  | { success: false; errors: { message: string }[] } {
  const isValid = checker.Check(value);

  if (isValid) {
    return {
      success: true,
      data: value as Static<T>,
    };
  }

  return {
    success: false,
    errors: Array.from(checker.Errors(value)).map((error) => ({
      message: error.message,
    })),
  };
}
