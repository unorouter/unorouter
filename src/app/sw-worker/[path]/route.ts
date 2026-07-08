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

export const { dynamic, dynamicParams, revalidate, generateStaticParams } =
  serwistRoute;

// Serwist's handler emits Cache-Control: max-age=14400, which the middleware NextResponse.next()
// header cannot override (a route handler's own Response wins). A cached SW keeps serving an old
// precache manifest whose chunk hashes no longer exist after a deploy (ChunkLoadError). Force
// no-store so every client always fetches the current build's worker.
export async function GET(
  ...args: Parameters<typeof serwistRoute.GET>
): Promise<Response> {
  const res = await serwistRoute.GET(...args);
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "no-store, must-revalidate");
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
