import { createSerwistRoute } from "@serwist/turbopack";
import { readFileSync } from "node:fs";
import path from "node:path";

// Per-build revision for non-hashed precache URLs (the offline page HTML).
const buildId = (() => {
  try {
    return readFileSync(path.join(process.cwd(), ".next/BUILD_ID"), "utf8").trim();
  } catch {
    return "dev";
  }
})();

// Turbopack-native Serwist: builds + serves the SW (and chunks) at /sw-worker/<path>;
// GET sets Service-Worker-Allowed so it can claim root scope "/". Path moved off
// /serwist/ after a deploy poisoned the Cloudflare cache un-purgeably with
// s-maxage=1yr; no-cache below prevents recurrence.
const serwistRoute = createSerwistRoute({
  swSrc: path.resolve(process.cwd(), "src/app/sw.ts"),
  // Native esbuild (transitive dep); esbuild-wasm is not installed.
  useNativeEsbuild: true,
  // Exclude public/ files the proxy locale-redirects: precaching a redirected
  // response makes cache.addAll reject and hangs SW install forever.
  globIgnores: ["**/node_modules/**/*", "**/i18n/**", "**/seo-timestamps.json"],
  // The glob only covers _next static output + public/, NOT rendered app-route
  // HTML, so the offline fallback document must be precached explicitly or the
  // sw.ts `fallbacks` entry never matches and offline navigations reject with
  // no-response instead of serving the fallback.
  additionalPrecacheEntries: [{ url: "/en/offline", revision: buildId }],
});

// Keep the factory's full config: GET reads a manifest generateStaticParams
// populates, dropping either 500s the route. Its force-static s-maxage=1yr is
// overridden by the no-cache header on /sw-worker/* (next.config + proxy.ts).
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  serwistRoute;
