import type { TypeCompiler } from "@sinclair/typebox/compiler";
import {
  DefaultErrorFunction,
  SetErrorFunction,
} from "@sinclair/typebox/errors";
import type { Static, TObject, TSchema } from "@sinclair/typebox/type";
import { Value } from "@sinclair/typebox/value";

SetErrorFunction((error) => {
  if (typeof error.schema.error === "string") return error.schema.error;
  return DefaultErrorFunction(error);
});

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

// Builds RHF form values from a DB row. `Value.Default` only fills `undefined`
// fields from the schema's `default:`, but DB rows use `null` for unset
// columns. Stripping the nulls first lets every schema default apply, so a
// nullable text column maps to "" and a nullable flag to false. Pass `{}` to
// get a fully default form (new-entity case).
export function formDefaults<T extends TObject>(
  schema: T,
  row: Record<string, unknown> = {},
): Static<T> {
  const defined = Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== null),
  );
  return Value.Default(schema, defined) as Static<T>;
}
