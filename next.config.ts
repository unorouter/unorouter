import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { LOCALES } from "./src/lib/config/constants";

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
      // Keeps the visible URL untouched.
      {
        source: "/",
        has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
        destination: "/llms.txt",
      },
      {
        source: `/:locale(${LOCALES.join("|")})`,
        has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
        destination: "/llms.txt",
      },
      // status.* subdomain serves the localized status page. Visible URL
      // stays https://status.unorouter.ai/.
      // next-intl middleware redirects bare `/` to `/<locale>` first, so we
      // also catch the post-redirect path.
      {
        source: "/",
        has: [{ type: "host", value: "status\\..*" }],
        destination: `/${LOCALES[0]}/status`,
      },
      {
        source: `/:locale(${LOCALES.join("|")})`,
        has: [{ type: "host", value: "status\\..*" }],
        destination: "/:locale/status",
      },
    ];
  },
  // Cross-origin isolation for OPFS sync access handles used by SQLocal
  // on the chat + generate route groups. Required for SQLite WASM to
  // persist its DB file across reloads. Marketing pages are untouched.
  async headers() {
    return [
      {
        source: "/:locale/chat/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/:locale/playground/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      // The SQLocal worker dynamically imports turbopack chunks from
      // /_next/static/. COEP `require-corp` on the page blocks any
      // sub-resource without `Cross-Origin-Resource-Policy: same-origin`.
      // Stamp CORP on every static chunk so the worker can load them.
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      // Same fix for /api/ - the OPFS-isolated page reads its own BFF
      // routes via fetch; without CORP those responses get COEP-blocked.
      {
        source: "/api/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: ["./public/i18n/de.json"],
  },
});

const configWithNextIntl = withNextIntl(nextConfig);

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
