import type { TranslationKey } from "@/lib/config/constants";
import type { TypeCompiler } from "@sinclair/typebox/compiler";
import type { ValueError } from "@sinclair/typebox/errors";
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

export class ResponseStatusError {
  timestamp!: Date;
  status!: number;
  error!: string;
  message!: string;
  path!: string;
  params?: Record<string, string>;
}

export type HandleError = {
  title: TranslationKey | (string & {});
  description?: TranslationKey | (string & {});
  params?: Record<string, string>;
};

export function handleError(
  e: unknown,
  t?: ReturnType<typeof useTranslations<never>>,
) {
  const error = e as ResponseStatusError;
  let errors: HandleError[] = [];

  try {
    const typeboxErrors = JSON.parse(error.message || "{}")
      .errors as ValueError[];

    errors = typeboxErrors.map((e) => ({
      title: e.path,
      description: e.message,
    }));
  } catch (e) {
    errors = [
      { title: error.error, description: error.message, params: error?.params },
    ];
  }

  for (const err of errors) {
    let title = "";
    try {
      title = t
        ? t(
            `MAIN.ERROR.${err.title}` as TranslationKey,
            err.params as Record<string, string>,
          )
        : err.title;
    } catch (e) {
      title = err.title;
    }

    let description = "";
    try {
      description = t
        ? t(
            err.description as TranslationKey,
            err.params as Record<string, string>,
          )
        : err.description || ""!;
    } catch (e) {
      description = err.description || "";
    }

    toast.error(title, {
      description,
      duration: 5000,
    });

    if (process.env.NODE_ENV === "production") console.clear();
  }
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
