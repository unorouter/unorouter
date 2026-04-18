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
    fr: "/modeles",
    ja: "/moderu",
    ru: "/модели",
    vi: "/mo-hinh",
    "zh-CN": "/moxing",
    "zh-TW": "/moxing",
  },
  "/models/[slug]": {
    de: "/modelle/[slug]",
    fr: "/modeles/[slug]",
    ja: "/moderu/[slug]",
    ru: "/модели/[slug]",
    vi: "/mo-hinh/[slug]",
    "zh-CN": "/moxing/[slug]",
    "zh-TW": "/moxing/[slug]",
  },
  "/pricing": {
    de: "/preise",
    fr: "/tarifs",
    ja: "/ryokin",
    ru: "/цены",
    vi: "/gia",
    "zh-CN": "/dingjia",
    "zh-TW": "/dingjia",
  },
  "/login": {
    de: "/anmelden",
    fr: "/connexion",
    ja: "/rogin",
    ru: "/вход",
    vi: "/dang-nhap",
    "zh-CN": "/denglu",
    "zh-TW": "/denglu",
  },
  "/register": {
    de: "/registrieren",
    fr: "/inscription",
    ja: "/toroku",
    ru: "/регистрация",
    vi: "/dang-ky",
    "zh-CN": "/zhuce",
    "zh-TW": "/zhuce",
  },
  "/dashboard": {
    de: "/dashboard",
    fr: "/tableau-de-bord",
    ja: "/dashboard",
    ru: "/панель",
    vi: "/bang-dieu-khien",
    "zh-CN": "/kongzhitai",
    "zh-TW": "/kongzhitai",
  },
  "/token": {
    de: "/token",
    fr: "/jetons",
    ja: "/token",
    ru: "/токены",
    vi: "/token",
    "zh-CN": "/lingpai",
    "zh-TW": "/lingpai",
  },
  "/logs": {
    de: "/protokolle",
    fr: "/journaux",
    ja: "/logu",
    ru: "/журналы",
    vi: "/nhat-ky",
    "zh-CN": "/rizhi",
    "zh-TW": "/rizhi",
  },
  "/billing": {
    de: "/abrechnung",
    fr: "/facturation",
    ja: "/seikyu",
    ru: "/платежи",
    vi: "/thanh-toan",
    "zh-CN": "/jiefei",
    "zh-TW": "/jiefei",
  },
  "/affiliate": {
    de: "/partner",
    fr: "/partenaires",
    ja: "/paatonaa",
    ru: "/партнёры",
    vi: "/doi-tac",
    "zh-CN": "/tuiguang",
    "zh-TW": "/tuiguang",
  },
  "/settings": {
    de: "/einstellungen",
    fr: "/parametres",
    ja: "/settei",
    ru: "/настройки",
    vi: "/cai-dat",
    "zh-CN": "/shezhi",
    "zh-TW": "/shezhi",
  },
  "/blog": {
    de: "/blog",
    fr: "/blog",
    ja: "/blog",
    ru: "/блог",
    vi: "/blog",
    "zh-CN": "/boke",
    "zh-TW": "/boke",
  },
  "/blog/[slug]": {
    de: "/blog/[slug]",
    fr: "/blog/[slug]",
    ja: "/blog/[slug]",
    ru: "/блог/[slug]",
    vi: "/blog/[slug]",
    "zh-CN": "/boke/[slug]",
    "zh-TW": "/boke/[slug]",
  },
  "/docs": {
    de: "/docs",
    fr: "/docs",
    ja: "/docs",
    ru: "/docs",
    vi: "/docs",
    "zh-CN": "/docs",
    "zh-TW": "/docs",
  },
  "/docs/claude-code": {
    de: "/docs/claude-code",
    fr: "/docs/claude-code",
    ja: "/docs/claude-code",
    ru: "/docs/claude-code",
    vi: "/docs/claude-code",
    "zh-CN": "/docs/claude-code",
    "zh-TW": "/docs/claude-code",
  },
  "/docs/codex": {
    de: "/docs/codex",
    fr: "/docs/codex",
    ja: "/docs/codex",
    ru: "/docs/codex",
    vi: "/docs/codex",
    "zh-CN": "/docs/codex",
    "zh-TW": "/docs/codex",
  },
  "/docs/gemini-cli": {
    de: "/docs/gemini-cli",
    fr: "/docs/gemini-cli",
    ja: "/docs/gemini-cli",
    ru: "/docs/gemini-cli",
    vi: "/docs/gemini-cli",
    "zh-CN": "/docs/gemini-cli",
    "zh-TW": "/docs/gemini-cli",
  },
  "/docs/openclaw": {
    de: "/docs/openclaw",
    fr: "/docs/openclaw",
    ja: "/docs/openclaw",
    ru: "/docs/openclaw",
    vi: "/docs/openclaw",
    "zh-CN": "/docs/openclaw",
    "zh-TW": "/docs/openclaw",
  },
  "/docs/cc-switch": {
    de: "/docs/cc-switch",
    fr: "/docs/cc-switch",
    ja: "/docs/cc-switch",
    ru: "/docs/cc-switch",
    vi: "/docs/cc-switch",
    "zh-CN": "/docs/cc-switch",
    "zh-TW": "/docs/cc-switch",
  },
  "/chat": {
    de: "/chat",
    fr: "/chat",
    ja: "/chat",
    ru: "/чат",
    vi: "/chat",
    "zh-CN": "/duihua",
    "zh-TW": "/duihua",
  },
  "/chat/[convId]": {
    de: "/chat/[convId]",
    fr: "/chat/[convId]",
    ja: "/chat/[convId]",
    ru: "/чат/[convId]",
    vi: "/chat/[convId]",
    "zh-CN": "/duihua/[convId]",
    "zh-TW": "/duihua/[convId]",
  },
  "/shared/[shareId]": {
    de: "/geteilt/[shareId]",
    fr: "/partage/[shareId]",
    ja: "/kyoyuu/[shareId]",
    ru: "/общий/[shareId]",
    vi: "/chia-se/[shareId]",
    "zh-CN": "/fenxiang/[shareId]",
    "zh-TW": "/fenxiang/[shareId]",
  },
  "/privacy": {
    de: "/datenschutz",
    fr: "/confidentialite",
    ja: "/puraibashii",
    ru: "/конфиденциальность",
    vi: "/quyen-rieng-tu",
    "zh-CN": "/yinsi",
    "zh-TW": "/yinsi",
  },
  "/terms": {
    de: "/agb",
    fr: "/conditions",
    ja: "/riyoukiyaku",
    ru: "/условия",
    vi: "/dieu-khoan",
    "zh-CN": "/tiaokuan",
    "zh-TW": "/tiaokuan",
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
