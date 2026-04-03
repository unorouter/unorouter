import { LOCALES } from "@/lib/config/constants";
import { defineRouting } from "next-intl/routing";
import { ComponentProps } from "react";
import { getPathname, Link, redirect, useRouter } from "./navigation";

export type LinkHref = ComponentProps<typeof Link>["href"];
export type RouterPush = Parameters<ReturnType<typeof useRouter>["push"]>[0];
export type Redirect = Parameters<typeof redirect>[0];
export type Pathname = Parameters<typeof getPathname>[0]["href"];

export type ValidRoutes = LinkHref | RouterPush | Redirect;

export const pathnames = {
  "/": "/",
  "/models": {
    de: "/modelle",
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
