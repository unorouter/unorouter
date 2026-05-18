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

// Preserves optionality: if options is optional (T includes undefined), so is query.
type ExtractQuery<T> = "query" extends keyof NonNullable<T>
  ? undefined extends T
    ? { query?: NonNullable<T>["query"] }
    : { query: NonNullable<T>["query"] }
  : {};

/**
 * Treaty 2 method signatures:
 *   GET (no query):    (options?)        idx0 options-like, optional
 *   GET (with query):  (options)         idx0 options-like, required
 *   POST (body only):  (body, options?)  idx0 body
 *   POST (body+query): (body, options)   idx0 body, idx1 options with query
 * Always check if idx0 is options-like first; if yes it's GET-style and query
 * comes from idx0, otherwise idx0 is body and query comes from idx1.
 */
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

// For hybrid routes, params are only included when the method lives on the
// return type (parameterized call), not when it's a static property on the
// function object itself.
type ShouldIncludeParams<TRoute, TMethod extends string> = TRoute extends (
  ...args: any[]
) => any
  ? TMethod extends keyof ReturnType<TRoute>
    ? true
    : false
  : false;

/**
 * Infers all args from an Eden Treaty route for any HTTP method.
 *
 * @example
 * // POST /:id with body + query
 * type A = EdenArgs<typeof rpc.api.user, "post">;
 * // { id: string; body: { name: string }; query: { count: string } }
 *
 * // GET with query (static route)
 * type B = EdenArgs<typeof rpc.api.demo.search, "get">;
 * // { query: { page: string; limit?: string } }
 *
 * // POST with body only (static route)
 * type C = EdenArgs<typeof rpc.api.demo.create, "post">;
 * // { body: { name: string; email: string } }
 *
 * // GET with params only
 * type D = EdenArgs<typeof rpc.api.demo, "get">;
 * // { id: string | number }
 *
 * // Hybrid: static POST on a parameterized route (no params needed)
 * type E = EdenArgs<typeof rpc.api.token, "post">;
 * // { body: { name: string; ... } }  (no id)
 */
export type EdenArgs<TRoute, TMethod extends string> = (ShouldIncludeParams<
  TRoute,
  TMethod
> extends true
  ? ExtractParams<TRoute>
  : {}) &
  ExtractBodyAndQuery<ResolveMethod<TRoute, TMethod>>;

export type EdenQuery<TRoute, TMethod extends string = "get"> =
  EdenArgs<TRoute, TMethod> extends { query?: infer Q } ? Q : never;

/**
 * Infers the unwrapped response type from an Eden Treaty route.
 *
 * Follows the same resolution chain as a real call:
 *   route to method to Awaited<ReturnType> to extract .data to unwrap { success, data }
 *
 * @example
 * type Convos = EdenResponse<typeof rpc.api.chat>;
 * // { items: [...]; total: number; page: number; pageSize: number }
 *
 * type Conv = EdenResponse<typeof rpc.api.chat, "get">;
 * // single conversation
 *
 * type Created = EdenResponse<typeof rpc.api.chat, "post">;
 * // { id: string; model: string; title: string | null }
 */
export type EdenResponse<TRoute, TMethod extends string = "get"> =
  ResolveMethod<TRoute, TMethod> extends (...args: any[]) => any
    ? Awaited<ReturnType<ResolveMethod<TRoute, TMethod>>> extends {
        data: infer D;
      }
      ? NonNullable<D> extends { success: boolean; data: infer Inner }
        ? Inner
        : NonNullable<D>
      : never
    : never;

// Eden returns { data: T; status: number } where T can be a union
// (e.g. ResponseDto | void for error branches).
export type ExtractData<T> = T extends { data: infer D }
  ? NonNullable<D>
  : never;

// TS's NonNullable only removes null | undefined; void survives as `void & {}`
// in strict mode.
export type ExcludeVoid<T> = T extends void ? never : T;

/**
 * Unwraps API response types that may be:
 *   wrapped: { success: boolean; message: string; data: D } becomes D
 *   direct:  T (no wrapper) stays T
 * Distributes over unions so { success, data: D } | void becomes D.
 */
export type UnwrapApiResponse<T> = ExcludeVoid<
  NonNullable<T extends { success: boolean; data: infer D } ? D : T>
>;
