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
  async headers() {
    return [
      {
        source: `/:locale(${LOCALES.join("|")})/:path(models|models/.*|pricing|docs|docs/.*|blog|blog/.*)?`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
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
