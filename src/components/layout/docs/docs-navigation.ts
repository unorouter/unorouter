import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type SetupCategory,
  setupGuidesByCategory,
} from "@/components/pages/docs/setup-guides";
import type { IntegrationIconKey } from "@/components/pages/docs/integrations";
import type { LinkHref } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";

/** Brand-icon data for a sidebar item, resolved by GuideIcon at render. */
export type GuideIconRef = {
  iconKey: IntegrationIconKey;
  logoSrc?: string;
  logoBg?: boolean;
  logoMono?: boolean;
};

export type DocsNavItem = {
  name: TranslationKey;
  href: LinkHref;
  iconName?: IconName;
  /** Per-guide brand logo; takes precedence over iconName in the sidebar. */
  guideIcon?: GuideIconRef;
  exact?: boolean;
};

export type DocsNavGroup = {
  labelKey: TranslationKey;
  items: DocsNavItem[];
};

/** One sidebar glyph per category. Used when a guide has no per-item icon. */
const CATEGORY_ICONS: Record<SetupCategory, IconName> = {
  coding: "code",
  roleplay: "drama",
  general: "message-circle",
  cli: "terminal",
};

export const docsNavItemsOverview: DocsNavItem[] = [
  {
    name: "DOCS_SIDEBAR.AI_APPLICATIONS",
    href: "/docs",
    iconName: "layout-grid",
    exact: true,
  },
];

    // Sidebar groups derived from SETUP_GUIDES (one per non-empty category); adding a guide updates the sidebar.
export const docsNavGroups: DocsNavGroup[] = (() => {
  const byCategory = setupGuidesByCategory();
  return CATEGORY_ORDER.flatMap((category) => {
    const guides = byCategory[category];
    if (guides.length === 0) return [];
    return [
      {
        labelKey: CATEGORY_LABELS[category],
        items: guides.map((guide) => ({
          name: guide.titleKey,
          href: guide.href,
          iconName: CATEGORY_ICONS[category],
          guideIcon: {
            iconKey: guide.iconKey,
            logoSrc: guide.logoSrc,
            logoBg: guide.logoBg,
            logoMono: guide.logoMono,
          },
        })),
      },
    ];
  });
})();
