import type SharpType from "sharp";

let cached: typeof SharpType | undefined;

export function loadSharp(): typeof SharpType {
  if (cached) return cached;
  const nodeRequire = process
    .getBuiltinModule("module")
    .createRequire(import.meta.url);
  cached = nodeRequire("sharp") as typeof SharpType;
  return cached;
}
