import { TranslationKey } from "../config/constants";

// Lives outside `config/constants.ts` to avoid an import cycle with
// `config/env.ts`, which throws ParamErrors at module-load time.
export class ParamError extends Error {
  public readonly params: Record<string, string | number>;
  constructor(key: TranslationKey, params: Record<string, string | number>) {
    super(key);
    this.name = "ParamError";
    this.params = params;
  }
}
