import type { IntegrationIconKey } from "@/components/pages/docs/integrations";
import { CHAT_DOCS } from "@/components/pages/docs/chat/chat-docs";
import { PLATFORM_DOCS } from "@/components/pages/docs/platform/platform-docs";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  setupGuidesByCategory,
} from "@/components/pages/docs/setup-guides";
import type { LinkHref } from "@/i18n/routing";
import { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";
import type { ComponentType } from "react";

const docsSubmenu = (): NavigationItem[] => {
  const byCategory = setupGuidesByCategory();
  const chatItems: NavigationItem[] = [
    {
      name: "DOCS_CHAT.INDEX.TITLE",
      subtitle: "DOCS_CHAT.INDEX.SUBTITLE",
      href: "/docs/chat",
      group: "DOCS_CHAT.COMMON.TAB_CHAT",
      iconName: "layout-grid",
    },
    ...CHAT_DOCS.slice(0, 3).map((doc): NavigationItem => ({
      name: `${doc.i18nPrefix}.TITLE`,
      subtitle: `${doc.i18nPrefix}.SUBTITLE`,
      href: doc.href,
      group: "DOCS_CHAT.COMMON.TAB_CHAT",
      iconName: doc.iconName,
    })),
  ];
  const platformItems: NavigationItem[] = [
    {
      name: "DOCS_PLATFORM.INDEX.TITLE",
      subtitle: "DOCS_PLATFORM.INDEX.SUBTITLE",
      href: "/docs/platform",
      group: "DOCS_PLATFORM.COMMON.TAB_PLATFORM",
      iconName: "layout-grid",
    },
    ...PLATFORM_DOCS.map((doc): NavigationItem => ({
      name: `${doc.i18nPrefix}.TITLE`,
      subtitle: `${doc.i18nPrefix}.SUBTITLE`,
      href: doc.href,
      group: "DOCS_PLATFORM.COMMON.TAB_PLATFORM",
      iconName: doc.iconName,
    })),
  ];
  return [
    ...platformItems,
    ...chatItems,
    // One row per category rather than one per guide. Listing all 24 integrations
    // here made the panel taller than the viewport and put a scrollbar inside a
    // menu; nobody scans two dozen logos to find their client, they go to the
    // index and search. Platform and Chat stay expanded: those are the pages the
    // navbar exists to reach.
    ...CATEGORY_ORDER.flatMap((category): NavigationItem[] => {
      const guides = byCategory[category];
      if (guides.length === 0) return [];
      return [
        {
          name: CATEGORY_LABELS[category],
          subtitle: CATEGORY_DESCRIPTIONS[category],
          href: "/docs/integrations",
          group: "DOCS_CHAT.COMMON.TAB_INTEGRATIONS",
          iconName: CATEGORY_ICONS[category],
        },
      ];
    }),
  ];
};

export type NavigationItem = {
  name: TranslationKey;
  subtitle?: TranslationKey;
  href: LinkHref;
  iconName?: IconName;
  iconComponent?: ComponentType<{ className?: string }>;
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

const fillParams = (path: string, params?: Record<string, unknown>) => {
  if (!params) return path;
  let out = path;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(`[${key}]`, String(value));
  }
  return out;
};

const resolveHref = (href: LinkHref) => {
  if (typeof href === "string") return href;
  const hrefParams = "params" in href && href.params ? href.params : undefined;
  return fillParams(href.pathname, hrefParams);
};

export const isActiveLink = (
  pathname: string,
  href: LinkHref,
  exact?: boolean,
  routeParams?: Record<string, unknown>,
) => {
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
