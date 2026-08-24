import {
  CHAT_DOC_SECTION_LABELS,
  CHAT_DOC_SECTION_ORDER,
  chatDocsBySection,
} from "@/components/pages/docs/chat/chat-docs";
import {
  PLATFORM_DOC_SECTION_LABELS,
  PLATFORM_DOC_SECTION_ORDER,
  platformDocsBySection,
} from "@/components/pages/docs/platform/platform-docs";
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  setupGuidesByCategory,
} from "@/components/pages/docs/setup-guides";
import type { IntegrationIconKey } from "@/components/pages/docs/integrations";
import type { LinkHref } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";

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
  guideIcon?: GuideIconRef;
  exact?: boolean;
};

export type DocsNavGroup = {
  labelKey: TranslationKey;
  items: DocsNavItem[];
};

export const docsNavItemsOverview: DocsNavItem[] = [
  {
    name: "DOCS_SIDEBAR.AI_APPLICATIONS",
    href: "/docs/integrations",
    iconName: "layout-grid",
    exact: true,
  },
];

export const chatDocsNavItemsOverview: DocsNavItem[] = [
  {
    name: "DOCS_CHAT.INDEX.TITLE",
    href: "/docs/chat",
    iconName: "layout-grid",
    exact: true,
  },
];

export const chatDocsNavGroups: DocsNavGroup[] = (() => {
  const bySection = chatDocsBySection();
  return CHAT_DOC_SECTION_ORDER.flatMap((section) => {
    const docs = bySection[section];
    if (docs.length === 0) return [];
    return [
      {
        labelKey: CHAT_DOC_SECTION_LABELS[section],
        items: docs.map((doc) => ({
          name: `${doc.i18nPrefix}.TITLE`,
          href: doc.href,
          iconName: doc.iconName,
        })),
      },
    ];
  });
})();

export const platformDocsNavItemsOverview: DocsNavItem[] = [
  {
    name: "DOCS_PLATFORM.INDEX.TITLE",
    href: "/docs/platform",
    iconName: "layout-grid",
    exact: true,
  },
];

export const platformDocsNavGroups: DocsNavGroup[] = (() => {
  const bySection = platformDocsBySection();
  return PLATFORM_DOC_SECTION_ORDER.flatMap((section) => {
    const docs = bySection[section];
    if (docs.length === 0) return [];
    return [
      {
        labelKey: PLATFORM_DOC_SECTION_LABELS[section],
        items: docs.map((doc) => ({
          name: `${doc.i18nPrefix}.TITLE`,
          href: doc.href,
          iconName: doc.iconName,
        })),
      },
    ];
  });
})();

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
