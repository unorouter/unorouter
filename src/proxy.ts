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
  // Cross-Origin-Resource-Policy for static chunks + API. The (chat) +
  // (generate) layouts set COEP: require-corp, which blocks any sub-resource
  // load that lacks CORP. Next dev/turbopack serves `_next/static/*` outside
  // the `headers()` config pipeline, so we stamp CORP here for every same-
  // origin asset request the worker pulls in.
  if (
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/sqlocal/")
  ) {
    const res = NextResponse.next();
    res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    // Workers spawned by a COEP-isolated page must themselves carry COEP +
    // COOP. The SQLocal worker is one of these turbopack chunks; stamp the
    // headers on every static chunk so any of them can be used as a worker
    // script.
    res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    return res;
  }

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

  // status.* subdomain: rewrite (not redirect) the visible URL to the localized
  // status page. Keeps the user on https://status.unorouter.ai/ while serving
  // the /<locale>/status route. Deep links (/api, assets) pass through.
  const host = request.headers.get("host") ?? "";
  const hostNoWww = host.startsWith("www.") ? host.slice(4) : host;
  if (hostNoWww.startsWith("status.") && isHomepage(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}/status`;
    return NextResponse.rewrite(url);
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
    "/((?!trpc|_vercel|ingest|.*\\.(?:ico|png|jpg|jpeg|svg|webp|avif|gif|css|map|txt|xml|woff|woff2|ttf|otf|eot|mp4|webm|pdf)).*)",
  ],
};
