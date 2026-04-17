import { LOCALES } from "@/lib/config/constants";
import { defineRouting } from "next-intl/routing";
import { ComponentProps } from "react";
import type { getPathname, Link, redirect, useRouter } from "./navigation";

export type LinkHref = ComponentProps<typeof Link>["href"];
export type RouterPush = Parameters<ReturnType<typeof useRouter>["push"]>[0];
export type Redirect = Parameters<typeof redirect>[0];
export type Pathname = Parameters<typeof getPathname>[0]["href"];
/** Keys of pathnames that don't contain a [param] segment. */
export type StaticRoute = Exclude<
  keyof typeof pathnames,
  `${string}[${string}`
>;

export type ValidRoutes = LinkHref | RouterPush | Redirect;

export const pathnames = {
  "/": "/",
  "/models": {
    de: "/modelle",
  },
  "/models/[slug]": {
    de: "/modelle/[slug]",
  },
  "/pricing": {
    de: "/preise",
  },
  "/login": {
    de: "/anmelden",
  },
  "/register": {
    de: "/registrieren",
  },
  "/dashboard": {
    de: "/dashboard",
  },
  "/token": {
    de: "/token",
  },
  "/logs": {
    de: "/protokolle",
  },
  "/billing": {
    de: "/abrechnung",
  },
  "/affiliate": {
    de: "/partner",
  },
  "/settings": {
    de: "/einstellungen",
  },
  "/blog": {
    de: "/blog",
  },
  "/blog/[slug]": {
    de: "/blog/[slug]",
  },
  "/docs": {
    de: "/docs",
  },
  "/docs/claude-code": {
    de: "/docs/claude-code",
  },
  "/docs/codex": {
    de: "/docs/codex",
  },
  "/docs/gemini-cli": {
    de: "/docs/gemini-cli",
  },
  "/docs/openclaw": {
    de: "/docs/openclaw",
  },
  "/docs/cc-switch": {
    de: "/docs/cc-switch",
  },
  "/chat": {
    de: "/chat",
  },
  "/chat/[convId]": {
    de: "/chat/[convId]",
  },
  "/shared/[shareId]": {
    de: "/geteilt/[shareId]",
  },
  "/privacy": {
    de: "/datenschutz",
  },
  "/terms": {
    de: "/agb",
  },
} as const;

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: LOCALES[0],
  localePrefix: "always",
  localeDetection: true,
  pathnames,
});

/**
 * Routes that must not be indexed by search engines.
 * Used by robots.ts (disallow rules) and sitemap.ts (exclusion).
 * Source of truth for private-area routing in one place.
 */
export const privateRoutes = {
  static: [
    "/dashboard",
    "/billing",
    "/token",
    "/logs",
    "/affiliate",
    "/settings",
  ],
  // Dynamic routes: the parent path is what we disallow so every child is covered.
  // /chat/[convId] and /shared/[shareId] are user-specific; /chat itself is public.
  dynamicParents: ["/chat/[convId]", "/shared/[shareId]"],
} as const satisfies {
  static: readonly (keyof typeof pathnames)[];
  dynamicParents: readonly (keyof typeof pathnames)[];
};

