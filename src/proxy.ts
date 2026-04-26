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
  // Match all pathnames except:
  // - … if they start with `/api`, `/trpc`, `/_next`, `/_vercel` or `/ingest`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|trpc|_next|_vercel|ingest|.*\\..*).*)",
};
