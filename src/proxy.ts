import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";

export default function proxy(request: NextRequest) {
  // Stamp CORP same-origin on _next/static (dev/turbopack bypasses headers()).
  // COEP-isolated workers need own COEP+COOP.
  if (
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/sqlocal/")
  ) {
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
