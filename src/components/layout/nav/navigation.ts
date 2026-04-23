import type { LinkHref } from "@/i18n/routing";
import { TranslationKey } from "@/lib/config/constants";
import Claude from "@lobehub/icons/es/Claude";
import Gemini from "@lobehub/icons/es/Gemini";
import OpenAI from "@lobehub/icons/es/OpenAI";
import type { ComponentType } from "react";
import { GiBroom, GiCrabClaw, GiFox } from "react-icons/gi";
import {
  LuArrowLeftRight,
  LuBookOpen,
  LuDollarSign,
  LuDrama,
  LuGift,
  LuHeart,
  LuHouse,
  LuKey,
  LuLayers,
  LuLayoutDashboard,
  LuMessageCircle,
  LuNewspaper,
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
  onClick?: (e: React.MouseEvent) => void;
  submenu?: NavigationItem[];
  /** Optional group label shown above this item when it differs from the previous item's group. */
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
      {
        name: "NAV.CC_SWITCH",
        href: "/docs/cc-switch",
        icon: LuArrowLeftRight,
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.OPENCLAW",
        href: "/docs/openclaw",
        icon: GiCrabClaw,
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.CLAUDE_CODE",
        href: "/docs/claude-code",
        icon: Claude,
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.CODEX",
        href: "/docs/codex",
        icon: OpenAI,
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.GEMINI_CLI",
        href: "/docs/gemini-cli",
        icon: Gemini,
        group: "NAV.GROUP_CLI",
      },
      {
        name: "NAV.SILLYTAVERN",
        href: "/docs/sillytavern",
        icon: LuDrama,
        group: "NAV.GROUP_ROLEPLAY",
      },
      {
        name: "NAV.JANITOR_AI",
        href: "/docs/janitor-ai",
        icon: GiBroom,
        group: "NAV.GROUP_ROLEPLAY",
      },
      {
        name: "NAV.RISUAI",
        href: "/docs/risuai",
        icon: GiFox,
        group: "NAV.GROUP_ROLEPLAY",
      },
      {
        name: "NAV.CHUB",
        href: "/docs/chub",
        icon: LuHeart,
        group: "NAV.GROUP_ROLEPLAY",
      },
    ],
  },
  { name: "NAV.BLOG", href: "/blog", icon: LuNewspaper },
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
