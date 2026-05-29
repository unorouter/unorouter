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
  // Exclude public/ files that next-intl/proxy redirects (bare /i18n/* and
  // /seo-timestamps.json -> locale redirect = opaqueredirect). Precaching a
  // redirected response makes cache.addAll reject, hanging SW install forever
  // (SW stuck "installing", never controls). These are runtime-loaded anyway.
  globIgnores: [
    "**/node_modules/**/*",
    "**/i18n/**",
    "**/seo-timestamps.json",
  ],
});

// Use the factory's full config (force-static + generateStaticParams). GET
// reads a build-time manifest map that generateStaticParams populates; dropping
// either 500s the route. The factory's force-static would emit s-maxage=1yr, but
// the `no-cache` Cache-Control header on /sw-worker/* (next.config + proxy.ts)
// overrides that at the edge, and the path moved off the poisoned /serwist key.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  serwistRoute;
