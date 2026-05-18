/** Error subclass that pairs a translation key with interpolation params.
 *  Server throws -> Elysia onError serializes `{ message, params }` ->
 *  client `handleError` reconstructs and calls `t(message, params)`.
 *
 *  Lives outside `config/constants.ts` to avoid an import cycle with
 *  `config/env.ts`, which needs to throw ParamErrors at module-load time. */
export class ParamError extends Error {
  public readonly params: Record<string, string | number>;
  constructor(key: string, params: Record<string, string | number>) {
    super(key);
    this.name = "ParamError";
    this.params = params;
  }
}
