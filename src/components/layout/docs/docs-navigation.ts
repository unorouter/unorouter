import type { LinkHref } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";
import Claude from "@lobehub/icons/es/Claude";
import Gemini from "@lobehub/icons/es/Gemini";
import OpenAI from "@lobehub/icons/es/OpenAI";
import type { ComponentType } from "react";

export type DocsNavItem = {
  name: TranslationKey;
  href: LinkHref;
  iconName?: IconName;
  iconComponent?: ComponentType<{ className?: string }>;
  exact?: boolean;
};

export const docsNavItemsOverview: DocsNavItem[] = [
  {
    name: "DOCS_SIDEBAR.AI_APPLICATIONS",
    href: "/docs",
    iconName: "layout-grid",
    exact: true,
  },
];

export const docsNavItemsCli: DocsNavItem[] = [
  {
    name: "DOCS_SIDEBAR.CC_SWITCH",
    href: "/docs/cc-switch",
    iconName: "arrow-left-right",
  },
  {
    name: "DOCS_SIDEBAR.OPENCLAW",
    href: "/docs/openclaw",
    iconName: "crab-claw",
  },
  {
    name: "DOCS_SIDEBAR.CLAUDE_CODE",
    href: "/docs/claude-code",
    iconComponent: Claude,
  },
  {
    name: "DOCS_SIDEBAR.CODEX_CLI",
    href: "/docs/codex",
    iconComponent: OpenAI,
  },
  {
    name: "DOCS_SIDEBAR.GEMINI_CLI",
    href: "/docs/gemini-cli",
    iconComponent: Gemini,
  },
];

export const docsNavItemsRoleplay: DocsNavItem[] = [
  {
    name: "DOCS_SIDEBAR.SILLYTAVERN",
    href: "/docs/sillytavern",
    iconName: "drama",
  },
  {
    name: "DOCS_SIDEBAR.JANITOR_AI",
    href: "/docs/janitor-ai",
    iconName: "broom",
  },
  {
    name: "DOCS_SIDEBAR.RISUAI",
    href: "/docs/risuai",
    iconName: "fox",
  },
  {
    name: "DOCS_SIDEBAR.CHUB",
    href: "/docs/chub",
    iconName: "heart",
  },
];

