import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";
import { resolveSeoPath } from "./lib/seo/seo-path";

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

  const seo = await resolveSeoPath(pathname);
  if (seo?.to) {
    const url = request.nextUrl.clone();
    url.pathname = seo.to;
    return NextResponse.redirect(url, 301);
  }
  if (seo?.gone) {
    // Rewrite rather than redirect: the URL stays put and the not-found UI
    // renders, but the status is a real 404 because it is set before the
    // shell streams.
    const res = NextResponse.rewrite(new URL("/_not-found", request.url), {
      status: 404,
    });
    // The verdict comes from a 5min pricing snapshot and the catalog churns as
    // channels flap, so a model can 404 for one window and be live the next.
    // Without this the 404 inherits the static route's year-long s-maxage and
    // a briefly-absent model stays dead at the edge until a manual purge.
    res.headers.set("Cache-Control", "public, max-age=0, s-maxage=300");
    return res;
  }

  request.headers.set(SERVER_URL_KEY, request.url);
  return createMiddleware(routing)(request);
}

export const config = {
  matcher: [
    "/((?!trpc|_vercel|ingest|\\.well-known|openapi\\.json|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|map|txt|xml|json|woff|woff2|ttf|otf|eot|mp4|webm|pdf|lua)).*)",
  ],
};
