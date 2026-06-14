import type SharpType from "sharp";

    // Turbopack stubs sharp to an empty module no matter how it's imported, so every badge PNG 500s. The only reliable escape is a require() the bundler can't statically see: process.getBuiltinModule is a runtime Node API, so Turbopack leaves it alone and createRequire resolves the real native addon from disk.
let cached: typeof SharpType | undefined;

export function loadSharp(): typeof SharpType {
  if (cached) return cached;
  const nodeRequire = process
    .getBuiltinModule("module")
    .createRequire(import.meta.url);
  cached = nodeRequire("sharp") as typeof SharpType;
  return cached;
}
