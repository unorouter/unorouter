import { createSerwistRoute } from "@serwist/turbopack";
import path from "node:path";

// Turbopack-native Serwist: builds + serves the service worker (and its chunks)
// at /serwist/<path> (e.g. /serwist/sw.js). The registrar (sw-register.tsx)
// points at /serwist/sw.js. createSerwistRoute's GET sets Service-Worker-Allowed
// so the SW served from /serwist/ can still claim root scope "/".
const serwistRoute = createSerwistRoute({
  swSrc: path.resolve(process.cwd(), "src/app/sw.ts"),
  // Use the native esbuild already present (transitive dep) instead of
  // esbuild-wasm, which is not installed.
  useNativeEsbuild: true,
});

export const { dynamicParams, generateStaticParams, GET } = serwistRoute;

// The factory exports `dynamic: "force-static"` + `revalidate: false`, which
// makes Next emit `s-maxage=31536000` on /serwist/sw.js -> Cloudflare caches the
// SW for a year and new versions never reach users. Override to force-dynamic
// so each request rebuilds/serves fresh (the SW is small; correctness > the
// static-cache win). Combined with the no-cache header in next.config/proxy.
export const dynamic = "force-dynamic";
export const revalidate = 0;
