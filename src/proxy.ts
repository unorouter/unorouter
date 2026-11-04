import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { PERSONAL_COOKIES, SERVER_URL_KEY } from "./lib/config/constants";

// Cloudflare serves stale only when the origin allows it; Next keeps a header set here.
function isAnonymousDocument(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  if (PERSONAL_COOKIES.some((name) => request.cookies.has(name))) return false;
  // Next strips the RSC header and _rsc param before middleware; flight fetches never ask for HTML.
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

export default function proxy(request: NextRequest) {
  request.headers.set(SERVER_URL_KEY, request.url);
  const response = createMiddleware(routing)(request);
  if (response.status === 200 && isAnonymousDocument(request)) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, stale-while-revalidate=600, stale-if-error=86400",
    );
  }
  return response;
}

// Omitting .js is deliberate: an excluded chunk gets locale-rewritten and 404s.
export const config = {
  matcher: [
    "/((?!trpc|_vercel|ingest|_next/|api/|sqlocal/|sw-worker/|\\.well-known|openapi\\.json|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|map|txt|xml|json|woff|woff2|ttf|otf|eot|mp4|webm|pdf|lua)).*)",
  ],
};
