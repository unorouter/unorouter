/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extracts params from an Eden Treaty route function.
 */
type ExtractParams<TRoute> = TRoute extends (...args: any[]) => any
  ? Parameters<TRoute>[0]
  : {};

/**
 * Resolves the method function from a route (handles static, parameterized, and hybrid).
 *
 * Hybrid routes are both callable (parameterized) and have static methods.
 * For these, check the return type first, then fall back to own properties.
 */
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

/**
 * Checks if a type looks like Eden Treaty options (has query/headers/fetch/throwHttpError keys).
 * Uses `keyof` to detect optional properties that `extends { key: any }` would miss.
 */
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

/**
 * Extracts query from an options-like type.
 * Preserves optionality: if the options param itself is optional (T includes undefined),
 * the query field is also optional.
 */
type ExtractQuery<T> = "query" extends keyof NonNullable<T>
  ? undefined extends T
    ? { query?: NonNullable<T>["query"] }
    : { query: NonNullable<T>["query"] }
  : {};

/**
 * Extracts body + query from an Eden Treaty method function.
 *
 * Treaty 2 method signatures:
 * - GET (no query):    (options?) where options is optional, idx0 is options-like
 * - GET (with query):  (options) where options is required, idx0 is options-like
 * - POST (body only):  (body, options?) idx0 is body (not options-like)
 * - POST (body+query): (body, options) idx0 is body, idx1 is options with query
 *
 * Key insight: always check if idx0 is options-like first.
 * If yes -> it's a GET-style call, extract query from idx0.
 * If no  -> idx0 is body, extract query from idx1.
 */
type ExtractBodyAndQuery<TFn> = TFn extends (...args: any[]) => any
  ? 0 extends keyof Parameters<TFn>
    ? IsOptions<Parameters<TFn>[0]> extends true
      ? // First param is options (GET/HEAD style)
        ExtractQuery<Parameters<TFn>[0]>
      : // First param is body (POST/PUT/PATCH/DELETE style)
        [unknown] extends [Parameters<TFn>[0]]
        ? {}
        : { body: NonNullable<Parameters<TFn>[0]> } & ExtractQuery<
            Parameters<TFn>[1]
          >
    : {}
  : {};

/**
 * Determines whether params should be included.
 *
 * For hybrid routes (callable + static methods), params are only included
 * when the method lives on the return type (parameterized call), not when
 * it's a static property on the function object itself.
 */
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

/**
 * Extracts the query type from an Eden Treaty route for a given HTTP method.
 * Convenience alias for use in query key definitions.
 */
export type EdenQuery<TRoute, TMethod extends string = "get"> =
  EdenArgs<TRoute, TMethod> extends { query?: infer Q } ? Q : never;
