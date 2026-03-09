import { TranslationKey } from "@/lib/config/constants";
import type { IconType } from "react-icons/lib";
import {
  LuBookOpen,
  LuCpu,
  LuDollarSign,
  LuGift,
  LuHouse,
  LuKey,
  LuLayoutDashboard,
  LuLayers,
  LuScrollText,
  LuShell,
  LuSparkles,
  LuTerminal,
} from "react-icons/lu";

export type NavigationItem = {
  name: TranslationKey;
  href: string;
  icon?: IconType;
  hidden?: boolean;
  submenu?: NavigationItem[];
};

export const isActiveLink = (pathname: string, href: string) => {
  const cleanPathname = pathname.replace(/\/$/, "") || "/";
  const cleanHref = href.replace(/\/$/, "") || "/";

  if (cleanHref === "/") {
    return cleanPathname === "/";
  }

  return (
    cleanPathname === cleanHref || cleanPathname.startsWith(cleanHref + "/")
  );
};

export const navigation = (): NavigationItem[] => [
  { name: "NAV.HOME", href: "/", icon: LuHouse, hidden: true },
  { name: "NAV.MODELS", href: "/models", icon: LuLayers },
  { name: "NAV.PRICING", href: "/pricing", icon: LuDollarSign },
  {
    name: "NAV.DOCS",
    href: "/docs",
    icon: LuBookOpen,
    submenu: [
      { name: "NAV.CLAUDE_CODE", href: "/docs/claude-code", icon: LuTerminal },
      { name: "NAV.CODEX", href: "/docs/codex", icon: LuCpu },
      { name: "NAV.GEMINI_CLI", href: "/docs/gemini-cli", icon: LuSparkles },
      { name: "NAV.OPENCLAW", href: "/docs/openclaw", icon: LuShell },
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
    href: "/tokens",
    icon: LuKey,
  },
  {
    name: "SIDEBAR.LOGS",
    href: "/logs",
    icon: LuScrollText,
  },
  {
    name: "SIDEBAR.AFFILIATE",
    href: "/affiliate",
    icon: LuGift,
  },
];
