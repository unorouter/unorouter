import { createSerwistRoute } from "@serwist/turbopack";
import path from "node:path";

// Turbopack-native Serwist: builds + serves the service worker (and its chunks)
// at /serwist/<path> (e.g. /serwist/sw.js). The registrar (sw-register.tsx)
// points at /serwist/sw.js. createSerwistRoute's GET sets Service-Worker-Allowed
// so the SW served from /serwist/ can still claim root scope "/".
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: path.resolve(process.cwd(), "src/app/sw.ts"),
    // Use the native esbuild already present (transitive dep) instead of
    // esbuild-wasm, which is not installed.
    useNativeEsbuild: true,
  });
