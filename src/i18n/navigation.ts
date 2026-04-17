import type { Locale } from "next-intl";
import { createNavigation } from "next-intl/navigation";
import { type Pathname, routing, type StaticRoute } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

/** Locale-aware localized pathname (honors pathnames overrides like /modelle for de). */
export function localeUrl(locale: Locale, href: StaticRoute): string;
export function localeUrl(
  locale: Locale,
  href: Exclude<Pathname, string>,
): string;
export function localeUrl(locale: Locale, href: Pathname): string {
  return getPathname({ locale, href });
}
