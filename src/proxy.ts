import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";

// Infra prefixes must BYPASS the next-intl middleware: the matcher does not
// exclude .js, so without this early return chunk/API requests get locale-
// rewritten to /en/_next/... and 404.
const PASSTHROUGH_PATHS = ["/_next/", "/api/", "/sqlocal/", "/sw-worker/"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PASSTHROUGH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  request.headers.set(SERVER_URL_KEY, request.url);
  return createMiddleware(routing)(request);
}

export const config = {
  matcher: [
    "/((?!trpc|_vercel|ingest|\\.well-known|openapi\\.json|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|map|txt|xml|json|woff|woff2|ttf|otf|eot|mp4|webm|pdf|lua)).*)",
  ],
};
