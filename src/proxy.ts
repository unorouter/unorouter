import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SERVER_URL_KEY } from "./lib/config/constants";

function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const entries = accept.split(",").map((part) => {
    const segments = part.trim().split(";");
    const type = segments[0].trim().toLowerCase();
    const qSeg = segments.find((s) => s.trim().startsWith("q="));
    const q = qSeg ? Number(qSeg.split("=")[1]) : 1;
    return { type, q: Number.isFinite(q) ? q : 1 };
  });
  const md = entries.find((e) => e.type === "text/markdown");
  if (!md) return false;
  const html = entries.find((e) => e.type === "text/html");
  return !html || md.q >= html.q;
}

function isHomepage(pathname: string): boolean {
  if (pathname === "/") return true;
  const match = pathname.match(/^\/([^/]+)\/?$/);
  if (!match) return false;
  return (routing.locales as readonly string[]).includes(match[1]);
}

export default async function proxy(request: NextRequest) {
  if (
    request.method === "GET" &&
    isHomepage(request.nextUrl.pathname) &&
    prefersMarkdown(request.headers.get("accept"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/llms.txt";
    return NextResponse.rewrite(url);
  }

  const response = createMiddleware(routing)(request);

  response.headers.set(SERVER_URL_KEY, request.url);
  response.headers.append("Vary", "Accept");

  return response;
}

export const config = {
  // Match all pathnames except:
  // - … if they start with `/api`, `/trpc`, `/_next`, `/_vercel` or `/ingest`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|trpc|_next|_vercel|ingest|.*\\..*).*)",
};
