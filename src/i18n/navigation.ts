import type { Locale } from "next-intl";
import { createNavigation } from "next-intl/navigation";
import { pathnames, type Pathname, routing, type StaticRoute } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

export function localeUrl(locale: Locale, href: StaticRoute): string;
export function localeUrl(
  locale: Locale,
  href: Exclude<Pathname, string>,
): string;
export function localeUrl(locale: Locale, href: Pathname): string;
export function localeUrl(locale: Locale, href: Pathname): string {
  return getPathname({ locale, href });
}

type Params<T extends string> = T extends `${string}[${infer P}]${infer R}`
  ? (P extends `...${infer C}`
      ? { [K in C]: string[] }
      : { [K in P]: string }) &
      Params<R>
  : Record<never, never>;

export type MatchedPathname = {
  [K in keyof typeof pathnames]: K extends `${string}[${string}]${string}`
    ? { pathname: K; params: Params<K> }
    : { pathname: K };
}[keyof typeof pathnames];

export function matchPathname(
  url: string,
  locale: Locale,
): MatchedPathname | null {
  const path = url.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";
  const keys = (Object.keys(pathnames) as (keyof typeof pathnames)[]).sort(
    (a, b) => b.length - a.length,
  );

  for (const key of keys) {
    const v = pathnames[key];
    const templates = [key, ...(typeof v === "string" ? [] : Object.values(v))];
    for (const tpl of templates) {
      const params = match(tpl, path);
      if (params) return { pathname: key, params } as MatchedPathname;
    }
  }
  return null;
}

function match(
  tpl: string,
  path: string,
): Record<string, string | string[]> | null {
  const t = tpl.split("/").filter(Boolean);
  const p = path.split("/").filter(Boolean);
  const params: Record<string, string | string[]> = {};
  for (let i = 0; i < t.length; i++) {
    const rest = t[i].match(/^\[\.\.\.([^\]]+)\]$/);
    if (rest) {
      const tail = p.slice(i);
      if (tail.length === 0) return null;
      params[rest[1]] = tail.map((s) => decodeURIComponent(s));
      return params;
    }
    if (i >= p.length) return null;
    const dyn = t[i].match(/^\[([^\]]+)\]$/);
    if (dyn) params[dyn[1]] = decodeURIComponent(p[i]);
    else if (t[i] !== p[i]) return null;
  }
  return t.length === p.length ? params : null;
}
