import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";

export default function proxy(request: NextRequest) {
  request.headers.set(SERVER_URL_KEY, request.url);
  return createMiddleware(routing)(request);
}

// The extension list does not cover .js, so an unexcluded chunk request gets
// locale-rewritten to /en/_next/... and 404s.
export const config = {
  matcher: [
    "/((?!trpc|_vercel|ingest|_next/|api/|sqlocal/|sw-worker/|\\.well-known|openapi\\.json|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|map|txt|xml|json|woff|woff2|ttf|otf|eot|mp4|webm|pdf|lua)).*)",
  ],
};
