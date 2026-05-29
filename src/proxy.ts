import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";

// Public endpoints embedded on third-party origins (badges, OG images).
const PUBLIC_CROSS_ORIGIN = ["/api/ops/badge"];

// Paths stamped same-origin so COEP-isolated pages (chat, playground) can
// load them. Dev/turbopack bypasses next.config.ts headers(), so middleware
// applies the same policy.
const ISOLATED_PATHS = ["/_next/", "/api/", "/sqlocal/"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Serwist SW route (/sw-worker/sw.js + chunks): must skip next-intl locale
  // rewrites. The route handler sets Service-Worker-Allowed + content-type
  // itself; we add CORP (COEP-isolated pages must load it) and no-cache so the
  // route is not cached for a year at the edge (else SW updates never reach
  // users).
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

  const response = createMiddleware(routing)(request);
  response.headers.set(SERVER_URL_KEY, request.url);
  return response;
}

export const config = {
  // Excludes infra + asset extensions only; model slugs with dots (glm-5.1)
  // need next-intl for locale path rewrites.
  matcher: [
    "/((?!trpc|_vercel|ingest|\\.well-known|openapi\\.json|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|map|txt|xml|woff|woff2|ttf|otf|eot|mp4|webm|pdf)).*)",
  ],
};
