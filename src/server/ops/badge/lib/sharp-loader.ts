import type SharpType from "sharp";

// Turbopack (Next 16.2 default bundler) stubs `sharp` to an empty module `{}`
// no matter how it is imported -- static, dynamic, or `serverExternalPackages`
// -- so every badge PNG 500s with "sharp is not a function". The only reliable
// escape is a require() the bundler cannot statically see and rewrite:
// `process.getBuiltinModule` is a runtime Node API (not an import), so Turbopack
// leaves it alone and createRequire resolves the real native addon from disk.
let cached: typeof SharpType | undefined;

export function loadSharp(): typeof SharpType {
  if (cached) return cached;
  const nodeRequire = process
    .getBuiltinModule("module")
    .createRequire(import.meta.url);
  cached = nodeRequire("sharp") as typeof SharpType;
  return cached;
}
