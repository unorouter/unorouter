import type { TranslationKey } from "@/lib/config/constants";
import type { IconType } from "react-icons";
import {
  LuLayoutGrid,
  LuSettings2,
  LuTerminal,
  LuCpu,
  LuSparkles,
  LuShell,
} from "react-icons/lu";

export type DocsNavItem = {
  name: TranslationKey;
  href: string;
  icon: IconType;
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
    icon: LuSettings2,
  },
  {
    name: "DOCS_SIDEBAR.OPENCLAW",
    href: "/docs/openclaw",
    icon: LuShell,
  },
  {
    name: "DOCS_SIDEBAR.CLAUDE_CODE",
    href: "/docs/claude-code",
    icon: LuTerminal,
  },
  {
    name: "DOCS_SIDEBAR.CODEX_CLI",
    href: "/docs/codex",
    icon: LuCpu,
  },
  {
    name: "DOCS_SIDEBAR.GEMINI_CLI",
    href: "/docs/gemini-cli",
    icon: LuSparkles,
  },
];
