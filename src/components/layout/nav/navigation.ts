import type { LinkHref } from "@/i18n/routing";
import { TranslationKey } from "@/lib/config/constants";
import Claude from "@lobehub/icons/es/Claude";
import Gemini from "@lobehub/icons/es/Gemini";
import OpenAI from "@lobehub/icons/es/OpenAI";
import type { ComponentType } from "react";
import { GiCrabClaw } from "react-icons/gi";
import {
  LuBookOpen,
  LuDollarSign,
  LuGift,
  LuHouse,
  LuKey,
  LuLayers,
  LuLayoutDashboard,
  LuMessageCircle,
  LuScrollText,
  LuSettings,
  LuWallet,
} from "react-icons/lu";

export type NavigationItem = {
  name: TranslationKey;
  href: LinkHref;
  icon?: ComponentType<{ className?: string }>;
  hidden?: boolean;
  exact?: boolean;
  submenu?: NavigationItem[];
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
  { name: "NAV.HOME", href: "/", icon: LuHouse, hidden: true },
  {
    name: "NAV.DASHBOARD",
    href: "/dashboard",
    icon: LuLayoutDashboard,
    hidden: !authenticated,
  },
  { name: "NAV.MODELS", href: "/models", icon: LuLayers },
  { name: "NAV.PRICING", href: "/pricing", icon: LuDollarSign },
  { name: "NAV.CHAT", href: "/chat", icon: LuMessageCircle, exact: true },
  {
    name: "NAV.DOCS",
    href: "/docs",
    icon: LuBookOpen,
    exact: true,
    submenu: [
      { name: "NAV.CLAUDE_CODE", href: "/docs/claude-code", icon: Claude },
      { name: "NAV.CODEX", href: "/docs/codex", icon: OpenAI },
      { name: "NAV.GEMINI_CLI", href: "/docs/gemini-cli", icon: Gemini },
      { name: "NAV.OPENCLAW", href: "/docs/openclaw", icon: GiCrabClaw },
    ],
  },
];

export const sidebarNavigation = (): NavigationItem[] => [
  {
    name: "SIDEBAR.DASHBOARD",
    href: "/dashboard",
    icon: LuLayoutDashboard,
  },
  {
    name: "SIDEBAR.TOKENS",
    href: "/token",
    icon: LuKey,
  },
  {
    name: "SIDEBAR.LOGS",
    href: "/logs",
    icon: LuScrollText,
  },
  {
    name: "SIDEBAR.BILLING",
    href: "/billing",
    icon: LuWallet,
  },
  {
    name: "SIDEBAR.AFFILIATE",
    href: "/affiliate",
    icon: LuGift,
  },
  {
    name: "SIDEBAR.SETTINGS",
    href: "/settings",
    icon: LuSettings,
  },
];
