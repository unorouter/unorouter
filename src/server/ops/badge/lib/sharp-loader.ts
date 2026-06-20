import type SharpType from "sharp";

// Turbopack stubs sharp to an empty module, 500ing every badge PNG. Escape via a require() it can't see: process.getBuiltinModule + createRequire resolve the real native addon.
let cached: typeof SharpType | undefined;

export function loadSharp(): typeof SharpType {
  if (cached) return cached;
  const nodeRequire = process
    .getBuiltinModule("module")
    .createRequire(import.meta.url);
  cached = nodeRequire("sharp") as typeof SharpType;
  return cached;
}
