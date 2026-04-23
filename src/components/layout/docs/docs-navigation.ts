import type { LinkHref } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import Claude from "@lobehub/icons/es/Claude";
import Gemini from "@lobehub/icons/es/Gemini";
import OpenAI from "@lobehub/icons/es/OpenAI";
import type { ComponentType } from "react";
import { GiBroom, GiCrabClaw, GiFox } from "react-icons/gi";
import {
  LuArrowLeftRight,
  LuDrama,
  LuHeart,
  LuLayoutGrid,
} from "react-icons/lu";

export type DocsNavItem = {
  name: TranslationKey;
  href: LinkHref;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

export const docsNavItemsOverview: DocsNavItem[] = [
  {
    name: "DOCS_SIDEBAR.AI_APPLICATIONS",
    href: "/docs",
    icon: LuLayoutGrid,
    exact: true,
  },
];

export const docsNavItemsCli: DocsNavItem[] = [
  {
    name: "DOCS_SIDEBAR.CC_SWITCH",
    href: "/docs/cc-switch",
    icon: LuArrowLeftRight,
  },
  {
    name: "DOCS_SIDEBAR.OPENCLAW",
    href: "/docs/openclaw",
    icon: GiCrabClaw,
  },
  {
    name: "DOCS_SIDEBAR.CLAUDE_CODE",
    href: "/docs/claude-code",
    icon: Claude,
  },
  {
    name: "DOCS_SIDEBAR.CODEX_CLI",
    href: "/docs/codex",
    icon: OpenAI,
  },
  {
    name: "DOCS_SIDEBAR.GEMINI_CLI",
    href: "/docs/gemini-cli",
    icon: Gemini,
  },
];

export const docsNavItemsRoleplay: DocsNavItem[] = [
  {
    name: "DOCS_SIDEBAR.SILLYTAVERN",
    href: "/docs/sillytavern",
    icon: LuDrama,
  },
  {
    name: "DOCS_SIDEBAR.JANITOR_AI",
    href: "/docs/janitor-ai",
    icon: GiBroom,
  },
  {
    name: "DOCS_SIDEBAR.RISUAI",
    href: "/docs/risuai",
    icon: GiFox,
  },
  {
    name: "DOCS_SIDEBAR.CHUB",
    href: "/docs/chub",
    icon: LuHeart,
  },
];

/** Backwards-compat flat alias for callers that still import `docsNavItems`. */
export const docsNavItems: DocsNavItem[] = [
  ...docsNavItemsOverview,
  ...docsNavItemsCli,
  ...docsNavItemsRoleplay,
];
