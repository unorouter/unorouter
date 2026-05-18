import type { LinkHref } from "@/i18n/routing";
import { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";
import Claude from "@lobehub/icons/es/Claude";
import Gemini from "@lobehub/icons/es/Gemini";
import OpenAI from "@lobehub/icons/es/OpenAI";
import type { ComponentType } from "react";

export type NavigationItem = {
  name: TranslationKey;
  href: LinkHref;
  /** Icon name from the central registry. */
  iconName?: IconName;
  /** Vendor brand component (Claude/Gemini/OpenAI) - rendered as-is. */
  iconComponent?: ComponentType<{ className?: string }>;
  hidden?: boolean;
  exact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  submenu?: NavigationItem[];
  group?: TranslationKey;
};

export const isActiveLink = (
  pathname: string,
  href: LinkHref,
  exact?: boolean,
) => {
  const hrefStr = typeof href === "string" ? href : href.pathname;
  const cleanPathname = pathname.replace(/\/$/, "") || "/";
  const cleanHref = hrefStr.replace(/\/$/, "") || "/";

  if (exact || cleanHref === "/") {
    return cleanPathname === cleanHref;
  }

  return (
    cleanPathname === cleanHref || cleanPathname.startsWith(cleanHref + "/")
  );
};

export const navigation = (authenticated?: boolean): NavigationItem[] => [
  { name: "NAV.HOME", href: "/", iconName: "house", hidden: true },
  {
    name: "NAV.DASHBOARD",
    href: "/dashboard",
    iconName: "layout-dashboard",
    hidden: !authenticated,
  },
  { name: "NAV.MODELS", href: "/models", iconName: "layers" },
  { name: "NAV.RANKINGS", href: "/rankings", iconName: "chart-column-big" },
  { name: "NAV.PRICING", href: "/pricing", iconName: "dollar-sign" },
  { name: "NAV.CHAT", href: "/chat", iconName: "message-circle", exact: true },
  {
    name: "NAV.PLAYGROUND",
    href: "/playground",
    iconName: "wand",
    exact: true,
    hidden: true,
  },
  {
    name: "NAV.DOCS",
    href: "/docs",
    iconName: "book-open",
    exact: true,
    submenu: [
      {
        name: "NAV.CC_SWITCH",
        href: "/docs/cc-switch",
        iconName: "arrow-left-right",
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.OPENCLAW",
        href: "/docs/openclaw",
        iconName: "crab-claw",
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.CLAUDE_CODE",
        href: "/docs/claude-code",
        iconComponent: Claude,
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.CODEX",
        href: "/docs/codex",
        iconComponent: OpenAI,
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.GEMINI_CLI",
        href: "/docs/gemini-cli",
        iconComponent: Gemini,
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.SILLYTAVERN",
        href: "/docs/sillytavern",
        iconName: "drama",
        group: "NAV.GROUP_ROLEPLAY",
      },
      {
        name: "NAV.JANITOR_AI",
        href: "/docs/janitor-ai",
        iconName: "broom",
        group: "NAV.GROUP_ROLEPLAY",
      },
      {
        name: "NAV.RISUAI",
        href: "/docs/risuai",
        iconName: "fox",
        group: "NAV.GROUP_ROLEPLAY",
      },
      {
        name: "NAV.CHUB",
        href: "/docs/chub",
        iconName: "heart",
        group: "NAV.GROUP_ROLEPLAY",
      },
    ],
  },
  { name: "NAV.BLOG", href: "/blog", iconName: "newspaper" },
];

export const sidebarNavigation = (): NavigationItem[] => [
  {
    name: "SIDEBAR.DASHBOARD",
    href: "/dashboard",
    iconName: "layout-dashboard",
  },
  {
    name: "SIDEBAR.TOKENS",
    href: "/token",
    iconName: "key",
  },
  {
    name: "SIDEBAR.LOGS",
    href: "/logs",
    iconName: "scroll-text",
  },
  {
    name: "SIDEBAR.BILLING",
    href: "/billing",
    iconName: "wallet",
  },
  {
    name: "SIDEBAR.AFFILIATE",
    href: "/affiliate",
    iconName: "gift",
  },
  {
    name: "SIDEBAR.SETTINGS",
    href: "/settings",
    iconName: "settings",
  },
];
