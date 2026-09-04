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
  globIgnores: ["**/node_modules/**/*", "**/i18n/**", "**/search-index.*.json"],
  // /recover is the wedged-worker escape hatch and must come from the
  // precache: in that state every network fetch through the worker hangs.
  additionalPrecacheEntries: [
    { url: "/en/offline", revision: buildId },
    { url: "/en/recover", revision: buildId },
  ],
});

export const { dynamic, dynamicParams, revalidate, generateStaticParams } =
  serwistRoute;

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
