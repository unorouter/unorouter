import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";

const PUBLIC_CROSS_ORIGIN = ["/api/ops/badge"];

const ISOLATED_PATHS = ["/_next/", "/api/", "/sqlocal/"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/sw-worker/")) {
    const res = NextResponse.next();
    res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    res.headers.set("Cache-Control", "no-store, must-revalidate");
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

  request.headers.set(SERVER_URL_KEY, request.url);
  const res = createMiddleware(routing)(request);
  // Isolate every document, not just /chat: a non-isolated page navigating into
  // the isolated chat forces a full document reload (the isolation state is
  // fixed at document creation; CrossOriginIsolationGuard reloads to acquire
  // SharedArrayBuffer for OPFS). With the whole app isolated the transition is
  // a soft SPA nav. Exclusions (matched on the INTERNAL post-i18n-rewrite path,
  // so localized URLs are covered): login/register/consent embed the Cloudflare
  // Turnstile script+iframe, and /blog hot-links external badge images; both
  // break under COEP require-corp.
  const rewrite = res.headers.get("x-middleware-rewrite");
  const internalPath = rewrite ? new URL(rewrite).pathname : pathname;
  if (
    !/^\/[a-zA-Z-]+\/(login|register|consent|blog)(\/|$)/.test(internalPath)
  ) {
    res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!trpc|_vercel|ingest|\\.well-known|openapi\\.json|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|map|txt|xml|json|woff|woff2|ttf|otf|eot|mp4|webm|pdf|lua)).*)",
  ],
};
