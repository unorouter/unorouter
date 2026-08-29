import type { LinkHref } from "@/i18n/routing";
import { msg, type TranslationKey } from "@/lib/config/constants";
import Claude from "@lobehub/icons/es/Claude";
import Codex from "@lobehub/icons/es/Codex";
import Gemini from "@lobehub/icons/es/Gemini";
import type { ComponentType } from "react";

type IntegrationIcon = ComponentType<{
  className?: string;
  size?: number;
}>;

export type IntegrationKey =
  | "claude-code"
  | "codex"
  | "gemini-cli"
  | "openclaw"
  | "sillytavern"
  | "janitor-ai"
  | "risuai"
  | "chub";

type IntegrationColor =
  | "orange"
  | "emerald"
  | "blue"
  | "red"
  | "fuchsia"
  | "cyan"
  | "yellow"
  | "purple";

export type IntegrationEntry = {
  key: IntegrationKey;
  href: LinkHref;
  icon?: IntegrationIcon;
  logoSrc?: string;
  logoBg?: boolean;
  badge: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  badgeKey: TranslationKey;
  color: IntegrationColor;
};

export const CLI_INTEGRATIONS: readonly IntegrationEntry[] = [
  {
    key: "claude-code",
    href: "/docs/integrations/claude-code",
    icon: Claude.Color,
    badge: "Claude Code",
    titleKey: msg("HOME.INTEGRATION.CLAUDE_CODE.TITLE"),
    descKey: msg("HOME.INTEGRATION.CLAUDE_CODE.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.CLAUDE_CODE.BADGE"),
    color: "orange",
  },
  {
    key: "codex",
    href: "/docs/integrations/codex",
    icon: Codex.Color,
    badge: "Codex CLI",
    titleKey: msg("HOME.INTEGRATION.CODEX.TITLE"),
    descKey: msg("HOME.INTEGRATION.CODEX.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.CODEX.BADGE"),
    color: "emerald",
  },
  {
    key: "gemini-cli",
    href: "/docs/integrations/gemini-cli",
    icon: Gemini.Color,
    badge: "Gemini CLI",
    titleKey: msg("HOME.INTEGRATION.GEMINI_CLI.TITLE"),
    descKey: msg("HOME.INTEGRATION.GEMINI_CLI.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.GEMINI_CLI.BADGE"),
    color: "blue",
  },
  {
    key: "openclaw",
    href: "/docs/integrations/openclaw",
    logoSrc: "/images/icons/openclaw.svg",
    badge: "OpenClaw",
    titleKey: msg("HOME.INTEGRATION.OPENCLAW.TITLE"),
    descKey: msg("HOME.INTEGRATION.OPENCLAW.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.OPENCLAW.BADGE"),
    color: "red",
  },
];

export const RP_INTEGRATIONS: readonly IntegrationEntry[] = [
  {
    key: "sillytavern",
    href: "/docs/integrations/sillytavern",
    logoSrc: "/images/icons/sillytavern.png",
    badge: "SillyTavern",
    titleKey: msg("HOME.INTEGRATION.SILLYTAVERN.TITLE"),
    descKey: msg("HOME.INTEGRATION.SILLYTAVERN.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.SILLYTAVERN.BADGE"),
    color: "fuchsia",
  },
  {
    key: "janitor-ai",
    href: "/docs/integrations/janitor-ai",
    logoSrc: "/images/icons/janitor-ai.png",
    badge: "Janitor.AI",
    titleKey: msg("HOME.INTEGRATION.JANITOR_AI.TITLE"),
    descKey: msg("HOME.INTEGRATION.JANITOR_AI.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.JANITOR_AI.BADGE"),
    color: "cyan",
  },
  {
    key: "risuai",
    href: "/docs/integrations/risuai",
    logoSrc: "/images/icons/risuai.png",
    badge: "RisuAI",
    titleKey: msg("HOME.INTEGRATION.RISUAI.TITLE"),
    descKey: msg("HOME.INTEGRATION.RISUAI.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.RISUAI.BADGE"),
    color: "yellow",
  },
  {
    key: "chub",
    href: "/docs/integrations/chub",
    logoSrc: "/images/icons/chub-ai.png",
    logoBg: true,
    badge: "Chub / Venus",
    titleKey: msg("HOME.INTEGRATION.CHUB.TITLE"),
    descKey: msg("HOME.INTEGRATION.CHUB.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.CHUB.BADGE"),
    color: "purple",
  },
];

const ALL_INTEGRATIONS: readonly IntegrationEntry[] = [
  ...CLI_INTEGRATIONS,
  ...RP_INTEGRATIONS,
];

const INTEGRATION_BY_KEY = new Map(ALL_INTEGRATIONS.map((i) => [i.key, i]));

export function getIntegration(key: IntegrationKey): IntegrationEntry {
  const entry = INTEGRATION_BY_KEY.get(key);
  if (!entry) throw new Error(`Unknown integration key: ${key}`);
  return entry;
}
