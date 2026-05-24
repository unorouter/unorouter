/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */

type ExtractParams<TRoute> = TRoute extends (...args: any[]) => any
  ? Parameters<TRoute>[0]
  : {};

// Hybrid routes are both callable (parameterized) and have static methods.
// Check the return type first, then fall back to own properties.
type ResolveMethod<TRoute, TMethod extends string> = TRoute extends (
  ...args: any[]
) => any
  ? TMethod extends keyof ReturnType<TRoute>
    ? ReturnType<TRoute>[TMethod]
    : TMethod extends keyof TRoute
      ? TRoute[TMethod]
      : never
  : TMethod extends keyof TRoute
    ? TRoute[TMethod]
    : never;

// Uses `keyof` to detect optional properties that `extends { key: any }` would miss.
type IsOptions<T> = [T] extends [never]
  ? false
  : "query" extends keyof NonNullable<T>
    ? true
    : "headers" extends keyof NonNullable<T>
      ? true
      : "fetch" extends keyof NonNullable<T>
        ? true
        : "throwHttpError" extends keyof NonNullable<T>
          ? true
          : false;

type ExtractQuery<T> = "query" extends keyof NonNullable<T>
  ? undefined extends T
    ? { query?: NonNullable<T>["query"] }
    : { query: NonNullable<T>["query"] }
  : {};

// Treaty 2: idx0 is options-like for GET, body for POST. Detect first so query
// comes from idx0 (GET) vs idx1 (POST).
type ExtractBodyAndQuery<TFn> = TFn extends (...args: any[]) => any
  ? 0 extends keyof Parameters<TFn>
    ? IsOptions<Parameters<TFn>[0]> extends true
      ? ExtractQuery<Parameters<TFn>[0]>
      : [unknown] extends [Parameters<TFn>[0]]
        ? {}
        : { body: NonNullable<Parameters<TFn>[0]> } & ExtractQuery<
            Parameters<TFn>[1]
          >
    : {}
  : {};

type ShouldIncludeParams<TRoute, TMethod extends string> = TRoute extends (
  ...args: any[]
) => any
  ? TMethod extends keyof ReturnType<TRoute>
    ? true
    : false
  : false;

export type EdenArgs<TRoute, TMethod extends string> = (ShouldIncludeParams<
  TRoute,
  TMethod
> extends true
  ? ExtractParams<TRoute>
  : {}) &
  ExtractBodyAndQuery<ResolveMethod<TRoute, TMethod>>;

export type EdenQuery<TRoute, TMethod extends string = "get"> =
  EdenArgs<TRoute, TMethod> extends { query?: infer Q } ? Q : never;

export type ExtractData<T> = T extends { data: infer D }
  ? NonNullable<D>
  : never;

// TS's NonNullable only removes null | undefined; void survives as `void & {}`.
export type ExcludeVoid<T> = T extends void ? never : T;

export type UnwrapApiResponse<T> = ExcludeVoid<
  NonNullable<T extends { success: boolean; data: infer D } ? D : T>
>;
