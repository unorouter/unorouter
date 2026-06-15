import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";

// Public endpoints embedded on third-party origins (badges, OG images).
const PUBLIC_CROSS_ORIGIN = ["/api/ops/badge"];

// Stamped same-origin so COEP-isolated pages can load them; middleware applies it because dev/turbopack bypasses next.config.ts headers().
const ISOLATED_PATHS = ["/_next/", "/api/", "/sqlocal/"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // SW route skips locale rewrites; add CORP (COEP pages must load it) and no-cache so SW updates aren't edge-cached for a year.
  if (pathname.startsWith("/sw-worker/")) {
    const res = NextResponse.next();
    res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    res.headers.set("Cache-Control", "no-cache, must-revalidate");
    return res;
  }

  if (PUBLIC_CROSS_ORIGIN.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    res.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    return res;
  }

  if (ISOLATED_PATHS.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    return res;
  }

  // Stamp the request URL so server components can read it (sidebar layout's /login?redirect=<path>).
  request.headers.set(SERVER_URL_KEY, request.url);
  return createMiddleware(routing)(request);
}

export const config = {
  // Excludes infra + asset extensions only; model slugs with dots need next-intl for locale path rewrites.
  matcher: [
    "/((?!trpc|_vercel|ingest|\\.well-known|openapi\\.json|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|map|txt|xml|json|woff|woff2|ttf|otf|eot|mp4|webm|pdf|lua)).*)",
  ],
};
