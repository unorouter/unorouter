import type { TypeCompiler } from "@sinclair/typebox/compiler";
import { t } from "elysia";
import {
  DefaultErrorFunction,
  SetErrorFunction,
} from "@sinclair/typebox/errors";
import type {
  Static,
  TLiteral,
  TObject,
  TSchema,
  TUnion,
} from "@sinclair/typebox/type";
import { Value } from "@sinclair/typebox/value";

SetErrorFunction((error) => {
  if (typeof error.schema.error === "string") return error.schema.error;
  return DefaultErrorFunction(error);
});

/** `schema | null`, defaulting null. The dominant column shape in validation. */
export function nullable<T extends TSchema>(schema: T) {
  return t.Union([schema, t.Null()], { default: null });
}

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

    // RHF form values from a DB row. Value.Default only fills undefined, so strip nulls first. Pass {} for a default form.
export function formDefaults<T extends TObject>(
  schema: T,
  row: Record<string, unknown> = {},
): Static<T> {
  const defined = Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== null),
  );
  return Value.Default(schema, defined) as Static<T>;
}

// Pull literal values out of a TypeBox literal union (single-source arrays/Sets).
export function unionLiterals<T extends string>(
  union: TUnion<TLiteral<T>[]>,
): readonly T[] {
  return union.anyOf.map((m) => m.const);
}

    // Single source for the 9 sampling-knob schema fragments. Divergences ride the options: presets allow temp to 4, rp.ts unbounds maxTokens.
type SamplingBoundOpts = {
  temperatureMax?: number;
  /** Omit for an unbounded maxTokens (preset body). */
  maxTokensMax?: number;
};

const optNullNum = (minimum: number, maximum?: number) =>
  t.Optional(
    t.Union([
      t.Number({ minimum, ...(maximum === undefined ? {} : { maximum }) }),
      t.Null(),
    ]),
  );

/** Optional-nullable variant (wire bodies: stream overrides, settings patch). */
export const samplingOptional = (opts?: SamplingBoundOpts) => ({
  temperature: optNullNum(0, opts?.temperatureMax ?? 2),
  topP: optNullNum(0, 1),
  topK: optNullNum(0, 1000),
  minP: optNullNum(0, 1),
  topA: optNullNum(0, 1),
  frequencyPenalty: optNullNum(-2, 2),
  presencePenalty: optNullNum(-2, 2),
  repetitionPenalty: optNullNum(0, 2),
  maxTokens: optNullNum(1, opts?.maxTokensMax ?? 1_000_000),
});

const nullNum = (minimum: number, maximum?: number) =>
  nullable(
    t.Number({ minimum, ...(maximum === undefined ? {} : { maximum }) }),
  );

/** Nullable-default variant (preset/conv-override bodies + RHF forms). */
export const samplingNullable = (opts?: SamplingBoundOpts) => ({
  temperature: nullNum(0, opts?.temperatureMax ?? 2),
  topP: nullNum(0, 1),
  topK: nullNum(0, 1000),
  minP: nullNum(0, 1),
  topA: nullNum(0, 1),
  frequencyPenalty: nullNum(-2, 2),
  presencePenalty: nullNum(-2, 2),
  repetitionPenalty: nullNum(0, 2),
  maxTokens: nullNum(1, opts?.maxTokensMax),
});
