import type { IntegrationIconKey } from "@/components/pages/docs/integrations";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  setupGuidesByCategory,
} from "@/components/pages/docs/setup-guides";
import type { LinkHref } from "@/i18n/routing";
import { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";
import type { ComponentType } from "react";

/**
 * Docs megamenu items, derived from SETUP_GUIDES (one entry per guide, grouped
 * by category in CATEGORY_ORDER) so the nav dropdown, the docs sidebar, and the
 * docs index all read the same source. Adding a guide updates all three.
 */
const docsSubmenu = (): NavigationItem[] => {
  const byCategory = setupGuidesByCategory();
  return CATEGORY_ORDER.flatMap((category) =>
    byCategory[category].map((guide) => ({
      name: guide.titleKey,
      subtitle: guide.subtitleKey,
      href: guide.href,
      group: CATEGORY_LABELS[category],
      guideIcon: {
        iconKey: guide.iconKey,
        logoSrc: guide.logoSrc,
        logoBg: guide.logoBg,
      },
    })),
  );
};

export type NavigationItem = {
  name: TranslationKey;
  /** Optional tagline shown under the name in the docs megamenu cards. */
  subtitle?: TranslationKey;
  href: LinkHref;
  /** Icon name from the central registry. */
  iconName?: IconName;
  /** Vendor brand component (Claude/Gemini/OpenAI) - rendered as-is. */
  iconComponent?: ComponentType<{ className?: string }>;
  /** Per-guide brand logo (docs sidebar); takes precedence over iconName. */
  guideIcon?: {
    iconKey: IntegrationIconKey;
    logoSrc?: string;
    logoBg?: boolean;
  };
  hidden?: boolean;
  exact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  submenu?: NavigationItem[];
  group?: TranslationKey;
};

/**
 * Substitute dynamic [param] segments in a pathname template with concrete
 * values. next-intl's usePathname() returns the template (e.g. "/docs/[slug]"),
 * and object hrefs carry their params separately, so both sides must be
 * resolved before comparison - otherwise every "/docs/[slug]" item matches.
 */
const fillParams = (path: string, params?: Record<string, string>) => {
  if (!params) return path;
  let out = path;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`[${key}]`, String(value));
  }
  return out;
};

const resolveHref = (href: LinkHref) => {
  if (typeof href === "string") return href;
  const hrefParams =
    "params" in href && href.params
      ? (href.params as Record<string, string>)
      : undefined;
  return fillParams(href.pathname, hrefParams);
};

export const isActiveLink = (
  pathname: string,
  href: LinkHref,
  exact?: boolean,
  routeParams?: Record<string, string>,
) => {
  // Resolve the template pathname with the current route's params, and the
  // href with its own params, so dynamic routes compare by concrete value.
  const cleanPathname =
    fillParams(pathname, routeParams).replace(/\/$/, "") || "/";
  const cleanHref = resolveHref(href).replace(/\/$/, "") || "/";

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
    submenu: docsSubmenu(),
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
