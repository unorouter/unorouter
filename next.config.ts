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
  // productionBrowserSourceMaps: true,
  // experimental: {
  //   allowDevelopmentBuild: true,
  // },
  images: {
    formats: ["image/webp"],
    qualities: [10, 25, 50, 75, 90, 100],
    minimumCacheTTL: 60 * 60 * 24,
  },
  async rewrites() {
    return [
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
      { source: "/api/ops/badge/:path*", headers: corpCrossOrigin },
      { source: "/_next/static/:path*", headers: corpSameOrigin },
      { source: "/api/:path((?!ops/badge).*)", headers: corpSameOrigin },
      // Force revalidation on the SW route so new SW versions propagate on
      // deploy (a year-long s-maxage once poisoned the edge cache and would not
      // purge; the route is force-dynamic now + this no-cache prevents recurrence).
      {
        source: "/sw-worker/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate" },
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
  },
});

const configWithNextIntl = withNextIntl(withSerwist(nextConfig));

export default process.env.STANDALONE
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
