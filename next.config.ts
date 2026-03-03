import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.unorouter.ai";

const nextConfig: NextConfig = {
  output: process.env.STANDALONE ? "standalone" : undefined,
  images: {
    formats: ["image/webp"],
    qualities: [10, 25, 50, 75, 90, 100],
    minimumCacheTTL: 60 * 60 * 24,
  },
  async rewrites() {
    return [
      {
        source: "/proxy/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: ["./public/i18n/en.json"],
  },
});

export default withNextIntl(nextConfig);
