import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { pathnames, routing } from "./i18n/routing";
import {
  ACCESS_TOKEN_COOKIE,
  LOCALES,
  SERVER_URL_KEY,
  USER_ID_COOKIE,
  USER_THEME_COOKIE,
} from "./lib/config/constants";

// Anonymous renders of these routes are identical for everyone. Cloudflare caches a page
// only when this header is present, so the list of cacheable routes lives here, next to
// pathnames, and not in the edge config.
const CACHEABLE_ROUTES: Record<string, number> = {
  "/": 300,
  "/models": 300,
  "/models/[...slug]": 300,
  "/pricing": 300,
  "/rankings": 300,
  "/compare": 300,
  "/compare/[...slugs]": 300,
  "/blog": 600,
  "/blog/[slug]": 600,
  "/docs": 600,
};

const PERSONAL_COOKIES = [
  ACCESS_TOKEN_COOKIE,
  USER_ID_COOKIE,
  USER_THEME_COOKIE,
];

type CacheableEntry = { path: string; subtree: boolean; ttl: number };

const cacheableEntries: CacheableEntry[] = Object.entries(
  CACHEABLE_ROUTES,
).flatMap(([key, ttl]) => {
  const localized = pathnames[key as keyof typeof pathnames];
  const dynamicAt = key.indexOf("/[");
  const subtree = dynamicAt !== -1 || key === "/docs";
  return LOCALES.map((locale) => {
    const raw =
      typeof localized === "string"
        ? localized
        : (localized[locale as keyof typeof localized] ?? key);
    const base =
      raw.indexOf("/[") === -1 ? raw : raw.slice(0, raw.indexOf("/["));
    const path = base === "/" ? `/${locale}` : `/${locale}${base}`;
    return { path, subtree, ttl };
  });
});

function cacheTtlFor(pathname: string): number | undefined {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  for (const entry of cacheableEntries) {
    if (
      decoded === entry.path ||
      (entry.subtree && decoded.startsWith(entry.path + "/"))
    ) {
      return entry.ttl;
    }
  }
  return undefined;
}

function isAnonymousPageRequest(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  if (request.headers.has("rsc") || request.headers.has("next-router-prefetch"))
    return false;
  if (request.nextUrl.searchParams.has("_rsc")) return false;
  if (request.headers.get("accept")?.includes("text/markdown")) return false;
  return !PERSONAL_COOKIES.some((name) => request.cookies.has(name));
}

export default function proxy(request: NextRequest) {
  request.headers.set(SERVER_URL_KEY, request.url);
  const response = createMiddleware(routing)(request);
  const ttl = cacheTtlFor(request.nextUrl.pathname);
  if (
    ttl !== undefined &&
    response.status === 200 &&
    isAnonymousPageRequest(request)
  ) {
    response.headers.set(
      "CDN-Cache-Control",
      `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
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
