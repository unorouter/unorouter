import { createSerwistRoute } from "@serwist/turbopack";
import path from "node:path";

// Turbopack-native Serwist: builds + serves the service worker (and its chunks)
// at /sw-worker/<path> (e.g. /sw-worker/sw.js). The registrar (sw-register.tsx)
// points at /sw-worker/sw.js. createSerwistRoute's GET sets Service-Worker-Allowed
// so the SW served from /sw-worker/ can still claim root scope "/".
//
// Path note: this used to be /serwist/, but one early deploy cached the SW with
// s-maxage=1yr and Cloudflare would not evict it via API purge. Moving the path
// gives a fresh cache key. The force-dynamic + no-cache below prevent recurrence.
const serwistRoute = createSerwistRoute({
  swSrc: path.resolve(process.cwd(), "src/app/sw.ts"),
  // Use the native esbuild already present (transitive dep) instead of
  // esbuild-wasm, which is not installed.
  useNativeEsbuild: true,
});

export const { dynamicParams, GET } = serwistRoute;

// The factory exports `dynamic: "force-static"` + `revalidate: false`, which
// makes Next emit `s-maxage=31536000` -> Cloudflare caches the SW for a year and
// new versions never reach users. Override to force-dynamic so each request
// serves fresh (the SW is small; correctness > the static-cache win). Combined
// with the no-cache header in next.config/proxy. generateStaticParams is dropped
// because force-dynamic builds on demand (and prebuild broke the .map route).
export const dynamic = "force-dynamic";
export const revalidate = 0;
