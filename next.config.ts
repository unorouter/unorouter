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

const nextConfig: NextConfig = {
  output: process.env.STANDALONE ? "standalone" : undefined,
  // Type errors gate the CI checks job (bun typecheck), not the deploy build;
  // checking types inside next build cost ~2.5min per deploy.
  typescript: { ignoreBuildErrors: true },
  env: {
    // Build-time date (YYYY-MM-DD) for og-image cache busting and the blog
    // publish-date filter, so both change per deploy rather than per request.
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
  // wasmoon's emscripten loader probes node builtins (`import('module')`);
  // alias them to an empty stub in browser bundles. Server keeps real modules
  // via serverExternalPackages below.
  turbopack: {
    resolveAlias: {
      module: { browser: "./src/lib/empty-module.ts" },
      // sqlite-wasm builds the OPFS async-proxy worker URL at runtime
      // (`new URL(proxyUri, import.meta.url)`), which turbopack cannot resolve
      // statically. Only installOpfsSAHPoolVfs is used here, so the worker1
      // entrypoint that reaches it is never loaded; stub it out.
      "./sqlite3-worker1.mjs": { browser: "./src/lib/empty-module.ts" },
    },
    // Four theme fonts are missing from the capsize metrics table next bundles,
    // so it cannot synthesize a size-matched fallback for them and says so on
    // every render. adjustFontFallback: false is the documented workaround and
    // does nothing here, because turbopack warns from its own Rust font path
    // rather than the JS loader that reads the flag.
    ignoreIssue: [{ path: "**", title: /Failed to find font override values/ }],
  },
  // satori is external so turbopack does not bundle its emscripten loader: bundling
  // rewrites harfbuzz's locateFile base to the build-root token "/ROOT", so the
  // runtime open() hits /ROOT/node_modules/satori/node_modules/harfbuzzjs/hb.wasm
  // and EVERY badge 500s (dev and standalone alike). Regressed in next 16.3.2.
  serverExternalPackages: ["wasmoon", "sharp", "unpdf", "satori"],
  cacheComponents: false,
  // The Serwist route bundles the SW with esbuild at request time;
  // the file tracer misses that and drops esbuild + serwist deps from the
  // standalone output (/sw-worker/sw.js then 500s in production).
  outputFileTracingIncludes: {
    "/sw-worker/**": [
      "./node_modules/esbuild/**/*",
      "./node_modules/@esbuild/**/*",
      "./node_modules/serwist/**/*",
      "./node_modules/@serwist/**/*",
      "./node_modules/idb/**/*",
    ],
  },
  experimental: {
    // Turbopack disk cache for `next build`; CI persists it via the
    // Dockerfile cache mount.
    turbopackFileSystemCacheForBuild: true,
    // TypeScript 7 ships no JS compiler API, so type checking must shell out
    // to the tsc binary instead of the in-process API.
    useTypeScriptCli: true,
    // inlineCss tried and reverted: duplicated the full 274KB stylesheet into
    // every document + RSC flight, far worse than the request it removed.
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
      // Static assets moved under /images; hotlinks and indexed URLs live on.
      {
        source: "/icons/:path*",
        destination: "/images/icons/:path*",
        permanent: true,
      },
      {
        source: "/badges/:path*",
        destination: "/images/badges/:path*",
        permanent: true,
      },
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
      // Never store the SW route: a cached SW serves a stale precache manifest
      // whose chunk hashes 404 after the next deploy (a year-long s-maxage once
      // poisoned the edge cache un-purgeably).
      {
        source: "/sw-worker/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

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
        releaseName: process.env.NEXT_PUBLIC_APP_NAME,
        // Symbolication itself is keyed on the //# chunkId= comment the plugin
        // injects, so this version does NOT gate whether stack traces resolve.
        // It is the release LABEL PostHog shows over each error, so a static
        // "1.0.0" made every error read as the same release. Use the build's
        // commit SHA (Docker ARG) so triage shows which commit produced it.
        releaseVersion:
          process.env.NEXT_PUBLIC_RELEASE_VERSION ||
          new Date().toISOString().slice(0, 10),
        deleteAfterUpload: true,
      },
    })
  : configWithNextIntl;
