import { createSerwistRoute } from "@serwist/turbopack";
import { readFileSync } from "node:fs";
import path from "node:path";

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

const serwistRoute = createSerwistRoute({
  swSrc: path.resolve(process.cwd(), "src/app/sw.ts"),
  useNativeEsbuild: true,
  globIgnores: [
    "**/node_modules/**/*",
    "**/i18n/**",
    "**/seo-timestamps.json",
    "**/search-index.*.json",
  ],
  additionalPrecacheEntries: [{ url: "/en/offline", revision: buildId }],
});

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  serwistRoute;
