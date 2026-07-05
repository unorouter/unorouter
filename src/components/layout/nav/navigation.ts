import type { IntegrationIconKey } from "@/components/pages/docs/integrations";
import { CHAT_DOCS } from "@/components/pages/docs/chat/chat-docs";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  setupGuidesByCategory,
} from "@/components/pages/docs/setup-guides";
import type { LinkHref } from "@/i18n/routing";
import { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";
import type { ComponentType } from "react";

// Derived from SETUP_GUIDES so nav dropdown, docs sidebar, and docs index share one source.
const docsSubmenu = (): NavigationItem[] => {
  const byCategory = setupGuidesByCategory();
  // Chat user guide leads the menu: overview card + the first few pages.
  const chatItems: NavigationItem[] = [
    {
      name: "DOCS_CHAT.INDEX.TITLE" as TranslationKey,
      subtitle: "DOCS_CHAT.INDEX.SUBTITLE" as TranslationKey,
      href: "/docs/chat",
      group: "DOCS_CHAT.COMMON.TAB_CHAT" as TranslationKey,
      iconName: "layout-grid",
    },
    ...CHAT_DOCS.slice(0, 3).map((doc): NavigationItem => ({
      name: `${doc.i18nPrefix}.TITLE` as TranslationKey,
      subtitle: `${doc.i18nPrefix}.SUBTITLE` as TranslationKey,
      href: doc.href,
      group: "DOCS_CHAT.COMMON.TAB_CHAT" as TranslationKey,
      iconName: doc.iconName,
    })),
  ];
  return [
    ...chatItems,
    ...CATEGORY_ORDER.flatMap((category) =>
      byCategory[category].map((guide) => ({
        name: guide.titleKey,
        subtitle: guide.subtitleKey,
        href: guide.href,
        group: CATEGORY_LABELS[category],
        guideIcon: {
          iconKey: guide.iconKey,
          logoSrc: guide.logoSrc,
          logoBg: guide.logoBg,
          logoMono: guide.logoMono,
        },
      })),
    ),
  ];
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
    logoMono?: boolean;
  };
  hidden?: boolean;
  exact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  submenu?: NavigationItem[];
  group?: TranslationKey;
};

// usePathname() returns the template; resolve both sides' params before comparing or every /docs/[slug] matches.
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
  // Resolve template and href each with their own params so dynamic routes compare by concrete value.
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
  {
    name: "NAV.MODEL_TESTER",
    href: "/ai-api-model-tester",
    iconName: "search",
    submenu: [
      {
        name: "MODEL_TESTER.TABS.HISTORY",
        subtitle: "MODEL_TESTER.NAV.HISTORY_DESC",
        href: "/ai-api-model-tester/history",
        iconName: "scroll-text",
      },
      {
        name: "MODEL_TESTER.TABS.RANKINGS",
        subtitle: "MODEL_TESTER.NAV.RANKINGS_DESC",
        href: "/ai-api-model-tester/rankings",
        iconName: "chart-column-big",
      },
    ],
  },
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
