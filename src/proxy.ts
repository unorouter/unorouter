import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";

function isHomepage(pathname: string): boolean {
  if (pathname === "/") return true;
  const match = pathname.match(/^\/([^/]+)\/?$/);
  if (!match) return false;
  return (routing.locales as readonly string[]).includes(match[1]);
}

export default function proxy(request: NextRequest) {
  if (
    request.method === "GET" &&
    isHomepage(request.nextUrl.pathname) &&
    request.headers.get("accept")?.includes("text/markdown")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/llms.txt";
    const rewrite = NextResponse.rewrite(url);
    rewrite.headers.append("Vary", "Accept");
    return rewrite;
  }

  const response = createMiddleware(routing)(request);

  response.headers.set(SERVER_URL_KEY, request.url);

  return response;
}

export const config = {
  // Match everything except infra prefixes and real static-asset extensions.
  // Don't exclude on "any dot" — slugs like `glm-5.1` legitimately contain dots
  // and must hit next-intl middleware so localized paths (e.g. /ja/moderu/[slug])
  // get rewritten to the canonical /models/[slug] route.
  matcher: [
    "/((?!api|trpc|_next|_vercel|ingest|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|js|map|txt|xml|json|woff|woff2|ttf|otf|eot|mp4|webm|pdf)).*)",
  ],
};
