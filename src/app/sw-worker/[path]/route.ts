import { createSerwistRoute } from "@serwist/turbopack";
import { readFileSync } from "node:fs";
import path from "node:path";

// Per-build revision for non-hashed precache URLs (the offline page HTML).
const buildId = (() => {
  try {
    return readFileSync(
      path.join(process.cwd(), ".next/BUILD_ID"),
      "utf8",
    ).trim();
  } catch {
    return "dev";
  }
})();

    // Serwist serves the SW at /sw-worker/<path>; GET sets Service-Worker-Allowed for root scope. Off /serwist after a CF cache poison.
const serwistRoute = createSerwistRoute({
  swSrc: path.resolve(process.cwd(), "src/app/sw.ts"),
  // Native esbuild (transitive dep); esbuild-wasm is not installed.
  useNativeEsbuild: true,
      // Exclude public/ files the proxy locale-redirects: precaching a redirected response hangs SW install forever.
  globIgnores: ["**/node_modules/**/*", "**/i18n/**", "**/seo-timestamps.json"],
      // Glob misses rendered app-route HTML, so precache the offline fallback explicitly or offline navigations reject.
  additionalPrecacheEntries: [{ url: "/en/offline", revision: buildId }],
});

    // Keep the factory's full config: GET reads a manifest from generateStaticParams. no-cache on /sw-worker/* overrides force-static.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  serwistRoute;
