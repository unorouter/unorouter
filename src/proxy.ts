import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";
import { canonicalModelPath, parseModelPath } from "./lib/seo/model-redirect";

// Infra prefixes must BYPASS the next-intl middleware: the matcher does not
// exclude .js, so without this early return chunk/API requests get locale-
// rewritten to /en/_next/... and 404.
const PASSTHROUGH_PATHS = ["/_next/", "/api/", "/sqlocal/"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/sw-worker/")) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    return res;
  }

  if (PASSTHROUGH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Retired model URLs (":free" dropped, or a "vendor/model" name addressed by
  // its bare model part) have to 301 from here. cacheComponents streams the
  // shell before the page's own notFound()/redirect() runs, so by then the 200
  // is committed and Google indexes the not-found body as a soft 404.
  const parsedModel = parseModelPath(pathname);
  if (parsedModel) {
    const target = await canonicalModelPath(parsedModel);
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url, 301);
    }
  }

  request.headers.set(SERVER_URL_KEY, request.url);
  return createMiddleware(routing)(request);
}

export const config = {
  matcher: [
    "/((?!trpc|_vercel|ingest|\\.well-known|openapi\\.json|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|map|txt|xml|json|woff|woff2|ttf|otf|eot|mp4|webm|pdf|lua)).*)",
  ],
};
