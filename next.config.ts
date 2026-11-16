import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { LOCALES } from "./src/lib/config/constants";

const localePattern = `/:locale(${LOCALES.join("|")})`;

const statusHost = [{ type: "host", value: "status\\..*" }] as const;

const nextConfig: NextConfig = {
  // Turbopack reuses chunk filenames across builds with different bytes; the
  // commit stamp makes an old page fetch its own chunks.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  // Kept out of the served assets by the patched adapter, uploaded to GlitchTip.
  productionBrowserSourceMaps: true,
  // CI typechecks separately; inside next build it cost ~2.5 min per deploy.
  typescript: { ignoreBuildErrors: true },
  env: {
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
  turbopack: {
    // GlitchTip matches stacks to source maps by these ids.
    debugIds: true,
    resolveAlias: {
      // wasmoon probes node builtins; browser bundles get an empty stub.
      module: { browser: "./src/lib/empty-module.ts" },
      // Unresolvable runtime worker URL; only installOpfsSAHPoolVfs is used.
      "./sqlite3-worker1.mjs": { browser: "./src/lib/empty-module.ts" },
    },
  },
  // Bundling satori rewrites harfbuzz's wasm path to "/ROOT" and every badge 500s.
  serverExternalPackages: ["wasmoon", "sharp", "unpdf", "satori"],
  // The SW route bundles with esbuild at request time, which the tracer misses.
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
    // Standalone never embeds them; the Dockerfile sets them aside for upload.
    serverSourceMaps: true,
    turbopackFileSystemCacheForBuild: true,
    // TypeScript 7 has no JS compiler API.
    useTypeScriptCli: true,
  },
  images: {
    formats: ["image/webp"],
    qualities: [10, 25, 50, 75, 90, 100],
    minimumCacheTTL: 60 * 60 * 24,
    // Badge previews carry a query string, which Next refuses unless declared.
    localPatterns: [
      { pathname: "/api/ops/badge/**" },
      { pathname: "/images/**" },
    ],
    // Badge previews are SVG; the CSP sandboxes them.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox; style-src 'unsafe-inline';",
  },
  async redirects() {
    const guideSlug = ":slug((?!chat$|platform$|integrations$)[^/]+)";
    // Old asset and guide URLs stay alive for hotlinks and indexed pages.
    return [
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
      // iOS Safari probes these root paths regardless of the link tag.
      {
        source: "/apple-touch-icon.png",
        destination: "/images/icons/apple-icon.png",
      },
      {
        source: "/apple-touch-icon-precomposed.png",
        destination: "/images/icons/apple-icon.png",
      },
      // next-intl redirects bare / to /<locale> first, so both are caught.
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
      {
        source: `/:path((?!(?:${LOCALES.join("|")})?$).*)`,
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      // Directories preview the home page in an iframe before listing us.
      ...["/", localePattern].map((source) => ({
        source,
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://buildhop.io https://*.buildhop.io",
          },
        ],
      })),
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      // A cached SW serves a stale precache manifest that 404s after a deploy.
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
    // Precompiled ICU: smaller pages, and a bad key fails the build.
    messages: {
      format: "json",
      path: "./public/i18n",
      locales: "infer",
      precompile: true,
    },
  },
});

export default withNextIntl(withSerwist(nextConfig));
