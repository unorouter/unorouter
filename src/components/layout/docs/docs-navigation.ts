import type { LinkHref } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import Claude from "@lobehub/icons/es/Claude";
import Gemini from "@lobehub/icons/es/Gemini";
import OpenAI from "@lobehub/icons/es/OpenAI";
import type { ComponentType } from "react";
import { GiCrabClaw } from "react-icons/gi";
import { LuArrowLeftRight, LuLayoutGrid } from "react-icons/lu";

export type DocsNavItem = {
  name: TranslationKey;
  href: LinkHref;
  icon: ComponentType<{ className?: string }>;
};

export const docsNavItems: DocsNavItem[] = [
  {
    name: "DOCS_SIDEBAR.AI_APPLICATIONS",
    href: "/docs",
    icon: LuLayoutGrid,
  },
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
