import { withPostHogConfig } from "@posthog/nextjs-config";
import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { LOCALES } from "./src/lib/config/constants";

const localePattern = `/:locale(${LOCALES.join("|")})`;
const acceptMarkdown = [
  { type: "header", key: "accept", value: ".*text/markdown.*" },
] as const;
const statusHost = [{ type: "host", value: "status\\..*" }] as const;

// COEP isolation for routes that mount SQLocal (OPFS-backed SQLite WASM).
// Browsers require a cross-origin-isolated context to use sync access handles.
const coepHeaders = [
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
const corpSameOrigin = [
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];
const corpCrossOrigin = [
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
];

const nextConfig: NextConfig = {
  output: process.env.STANDALONE ? "standalone" : undefined,
  env: {
    // Build-time date (YYYY-MM-DD) for og-image cache busting and the blog
    // publish-date filter: reading the clock during render is
    // non-deterministic and rejected by cacheComponents prerenders.
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
  // wasmoon's emscripten loader probes node builtins (`import('module')`);
  // alias them to an empty stub in browser bundles. Server keeps real modules
  // via serverExternalPackages below.
  turbopack: {
    resolveAlias: {
      module: { browser: "./src/lib/empty-module.ts" },
    },
  },
  serverExternalPackages: ["wasmoon", "sharp", "unpdf"],
  cacheComponents: true,
  // The Serwist route bundles the service worker with esbuild at request
  // time; since the route prerenders, the file tracer no longer sees esbuild
  // as a runtime dependency and drops it from the standalone output
  // (Cannot find package 'esbuild' -> /sw-worker/sw.js 500s in production).
  // esbuild resolves the worker's imports from node_modules at request time,
  // so serwist and its transitive deps must ship too.
  outputFileTracingIncludes: {
    "/sw-worker/**": [
      "./node_modules/esbuild/**/*",
      "./node_modules/@esbuild/**/*",
      "./node_modules/serwist/**/*",
      "./node_modules/@serwist/**/*",
      "./node_modules/idb/**/*",
    ],
  },
  // productionBrowserSourceMaps: true,
  experimental: {
    // allowDevelopmentBuild: true,
    // Turbopack disk cache for `next build` (experimental; dev cache is stable
    // and on by default). CI persists it via the Dockerfile cache mount.
    turbopackFileSystemCacheForBuild: true,
    // inlineCss tried and reverted: it inlined the full 274KB stylesheet into
    // every document AND duplicated it inside the RSC flight payload, costing
    // far more than the ~36KB render-blocking request it removed.
  },
  images: {
    formats: ["image/webp"],
    qualities: [10, 25, 50, 75, 90, 100],
    minimumCacheTTL: 60 * 60 * 24,
    // Badge hero images are local /api routes WITH a query string; Next blocks
    // local optimizer URLs that carry a search param unless declared here.
    // No `search` key = any query string on this path is allowed. /images and
    // /icons cover the brand logo and per-guide setup logos.
    localPatterns: [
      { pathname: "/api/ops/badge/**" },
      { pathname: "/images/**" },
      { pathname: "/icons/**" },
    ],
    // R2 public host for generated chat/playground media. SmartImage routes R2
    // URLs through the optimizer; data: URIs and other hosts fall back to
    // unoptimized so they never hit the optimizer (which rejects them).
    remotePatterns: [
      { protocol: "https", hostname: "media.unorouter.com", pathname: "/**" },
    ],
    // Badge previews are SVG from /api/ops/badge. The optimizer refuses SVG
    // unless allowed; lock it down with a sandboxing CSP so an optimized SVG
    // can't execute script or load subresources.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox; style-src 'unsafe-inline';",
  },
  async redirects() {
    // Guide detail pages moved under /docs/integrations/<slug>; bare /docs is
    // now the Platform tab. 301s keep indexed + externally linked URLs alive.
    const guideSlug = ":slug((?!chat$|platform$|integrations$)[^/]+)";
    return [
      { source: "/docs", destination: "/docs/platform", permanent: true },
      {
        source: `${localePattern}/docs`,
        destination: "/:locale/docs/platform",
        permanent: true,
      },
      {
        source: `/docs/${guideSlug}`,
        destination: "/docs/integrations/:slug",
        permanent: true,
      },
      {
        source: `${localePattern}/docs/${guideSlug}`,
        destination: "/:locale/docs/integrations/:slug",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      // iOS Safari probes these well-known root paths directly (ignoring the
      // <link rel="apple-touch-icon"> meta), 404ing on every iOS visit. Serve
      // the existing icon so the root probe resolves instead of throwing a
      // NEXT_HTTP_ERROR_FALLBACK 404 on the home route.
      {
        source: "/apple-touch-icon.png",
        destination: "/images/icons/apple-icon.png",
      },
      {
        source: "/apple-touch-icon-precomposed.png",
        destination: "/images/icons/apple-icon.png",
      },
      // Agents that GET the homepage with Accept: text/markdown get llms.txt.
      // Visible URL stays unchanged.
      { source: "/", has: [...acceptMarkdown], destination: "/llms.txt" },
      {
        source: localePattern,
        has: [...acceptMarkdown],
        destination: "/llms.txt",
      },
      // status.* subdomain serves the localized status page. next-intl
      // middleware redirects bare `/` to `/<locale>` first, so we catch both.
      {
        source: "/",
        has: [...statusHost],
        destination: `/${LOCALES[0]}/status`,
      },
      {
        source: localePattern,
        has: [...statusHost],
        destination: "/:locale/status",
      },
    ];
  },
  async headers() {
    return [
      { source: "/:locale/chat/:path*", headers: coepHeaders },
      { source: "/:locale/playground/:path*", headers: coepHeaders },
      // Model tester persists its history in SQLocal/OPFS, which needs cross-origin isolation.
      { source: "/:locale/ai-api-model-tester/:path*", headers: coepHeaders },
      { source: "/api/ops/badge/:path*", headers: corpCrossOrigin },
      { source: "/_next/static/:path*", headers: corpSameOrigin },
      { source: "/api/:path((?!ops/badge).*)", headers: corpSameOrigin },
      // public/ assets get Next's 4h default, which Lighthouse flags on every
      // page. Not immutable (no content hash in names), so 30d + SWR.
      ...["/badges/:path*", "/icons/:path*", "/images/:path*"].map(
        (source) => ({
          source,
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=2592000, stale-while-revalidate=86400",
            },
          ],
        }),
      ),
      // Never store the SW route so new SW versions propagate on deploy (a year-long s-maxage once
      // poisoned the edge cache and would not purge; Serwist's own handler emits max-age=14400 which
      // this and the route wrapper override). A stored SW keeps serving a stale precache manifest
      // whose chunk hashes 404 after the next deploy.
      {
        source: "/sw-worker/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

// Turbopack-native Serwist: the SW is served by an app route
// (src/app/sw-worker/[path]/route.ts via createSerwistRoute) at /sw-worker/sw.js,
// NOT a webpack InjectManifest plugin. withSerwist just marks esbuild as an
// external server package so the route can bundle the worker at request time.

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: ["./public/i18n/de.json"],
    // Precompile ICU messages to ASTs at build: ~9-15KB less JS per page and
    // invalid keys fail the build instead of erroring at render. No t.raw
    // anywhere in the repo (unsupported with precompilation).
    messages: {
      format: "json",
      path: "./public/i18n",
      locales: "infer",
      precompile: true,
    },
  },
});

const configWithNextIntl = withNextIntl(withSerwist(nextConfig));

// Read the flag directly: the constants-module indirection evaluated before
// env loading in the Docker build and the sourcemap upload kept running.
export default process.env.STANDALONE &&
process.env.NEXT_PUBLIC_POSTHOG_DISABLED !== "true"
  ? withPostHogConfig(configWithNextIntl, {
      personalApiKey: process.env.POSTHOG_API_KEY!,
      envId: process.env.POSTHOG_ENV_ID!,
      host: "https://eu.i.posthog.com",
      sourcemaps: {
        enabled: true,
        project: process.env.NEXT_PUBLIC_APP_NAME,
        version: "1.0.0",
        deleteAfterUpload: true,
      },
    })
  : configWithNextIntl;
