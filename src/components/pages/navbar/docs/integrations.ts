import type { LinkHref } from "@/i18n/routing";
import { TranslationKey } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import type { OS } from "@/lib/types/enums";

export type IntegrationIconKey =
  | "cc-switch"
  | "claude-code"
  | "codex"
  | "gemini"
  | "openclaw"
  | "sillytavern"
  | "janitor-ai"
  | "risuai"
  | "chub";

type IntegrationColor = {
  accent: string;
  badge: string;
  border: string;
  glow: string;
  bg: string;
  ring: string;
  arrow: string;
  line: string;
};

/** CLI tools: shell quickstart per OS. */
type CliIntegrationDef = {
  kind: "cli";
  href: LinkHref;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  badgeKey: TranslationKey;
  iconKey: IntegrationIconKey;
  color: IntegrationColor;
  quickStart: Record<OS, string>;
};

/** Roleplay clients: a single URL paste-target (no OS tabs, no shell). */
type RpIntegrationDef = {
  kind: "rp";
  href: LinkHref;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  badgeKey: TranslationKey;
  iconKey: IntegrationIconKey;
  color: IntegrationColor;
  /** Code-block content shown under Quick Start (e.g. URL + key lines). */
  quickConfig: string;
};

type IntegrationDef = CliIntegrationDef | RpIntegrationDef;

export const cliIntegrations = [
  {
    kind: "cli" as const,
    href: "/docs/cc-switch",
    titleKey: "DOCS.CC_SWITCH.TITLE",
    subtitleKey: "DOCS.CC_SWITCH.SUBTITLE",
    badgeKey: "DOCS.CC_SWITCH.BADGE",
    iconKey: "cc-switch",
    color: {
      accent: "text-violet-500",
      badge: "bg-violet-600 text-white",
      border: "border-violet-600/20",
      glow: "bg-violet-600/20",
      bg: "bg-violet-600/5",
      ring: "border-violet-600/30 hover:bg-violet-600 hover:border-violet-600",
      arrow: "text-violet-500 group-hover:text-white",
      line: "bg-violet-600/40",
    },
    quickStart: {
      windows: `# Download from GitHub Releases:
# https://github.com/farion1231/cc-switch/releases`,
      macos: `brew tap farion1231/ccswitch
brew install --cask cc-switch`,
      linux: `# Download from GitHub Releases:
# https://github.com/farion1231/cc-switch/releases`,
    },
  },
  {
    kind: "cli" as const,
    href: "/docs/claude-code",
    titleKey: "DOCS.CLAUDE_CODE.TITLE",
    subtitleKey: "DOCS.CLAUDE_CODE.SUBTITLE",
    badgeKey: "DOCS.CLAUDE_CODE.BADGE",
    iconKey: "claude-code",
    color: {
      accent: "text-orange-500",
      badge: "bg-orange-600 text-white",
      border: "border-orange-600/20",
      glow: "bg-orange-600/20",
      bg: "bg-orange-600/5",
      ring: "border-orange-600/30 hover:bg-orange-600 hover:border-orange-600",
      arrow: "text-orange-500 group-hover:text-white",
      line: "bg-orange-600/40",
    },
    quickStart: {
      windows: `$env:ANTHROPIC_BASE_URL="${env.apiUrl}"
$env:ANTHROPIC_API_KEY="YOUR_API_KEY"

claude`,
      macos: `export ANTHROPIC_BASE_URL="${env.apiUrl}"
export ANTHROPIC_API_KEY="YOUR_API_KEY"

claude`,
      linux: `export ANTHROPIC_BASE_URL="${env.apiUrl}"
export ANTHROPIC_API_KEY="YOUR_API_KEY"

claude`,
    },
  },
  {
    kind: "cli" as const,
    href: "/docs/codex",
    titleKey: "DOCS.CODEX.TITLE",
    subtitleKey: "DOCS.CODEX.SUBTITLE",
    badgeKey: "DOCS.CODEX.BADGE",
    iconKey: "codex",
    color: {
      accent: "text-emerald-500",
      badge: "bg-emerald-600 text-white",
      border: "border-emerald-600/20",
      glow: "bg-emerald-600/20",
      bg: "bg-emerald-600/5",
      ring: "border-emerald-600/30 hover:bg-emerald-600 hover:border-emerald-600",
      arrow: "text-emerald-500 group-hover:text-white",
      line: "bg-emerald-600/40",
    },
    quickStart: {
      windows: `$env:OPENAI_BASE_URL="${env.apiUrl}/v1"
$env:OPENAI_API_KEY="YOUR_API_KEY"

codex`,
      macos: `export OPENAI_BASE_URL="${env.apiUrl}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

codex`,
      linux: `export OPENAI_BASE_URL="${env.apiUrl}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

codex`,
    },
  },
  {
    kind: "cli" as const,
    href: "/docs/gemini-cli",
    titleKey: "DOCS.GEMINI_CLI.TITLE",
    subtitleKey: "DOCS.GEMINI_CLI.SUBTITLE",
    badgeKey: "DOCS.GEMINI_CLI.BADGE",
    iconKey: "gemini",
    color: {
      accent: "text-blue-500",
      badge: "bg-blue-600 text-white",
      border: "border-blue-600/20",
      glow: "bg-blue-600/20",
      bg: "bg-blue-600/5",
      ring: "border-blue-600/30 hover:bg-blue-600 hover:border-blue-600",
      arrow: "text-blue-500 group-hover:text-white",
      line: "bg-blue-600/40",
    },
    quickStart: {
      windows: `$env:GEMINI_API_BASE="${env.apiUrl}"
$env:GEMINI_API_KEY="YOUR_API_KEY"

gemini`,
      macos: `export GEMINI_API_BASE="${env.apiUrl}"
export GEMINI_API_KEY="YOUR_API_KEY"

gemini`,
      linux: `export GEMINI_API_BASE="${env.apiUrl}"
export GEMINI_API_KEY="YOUR_API_KEY"

gemini`,
    },
  },
  {
    kind: "cli" as const,
    href: "/docs/openclaw",
    titleKey: "DOCS.OPENCLAW.TITLE",
    subtitleKey: "DOCS.OPENCLAW.SUBTITLE",
    badgeKey: "DOCS.OPENCLAW.BADGE",
    iconKey: "openclaw",
    color: {
      accent: "text-red-500",
      badge: "bg-red-600 text-white",
      border: "border-red-600/20",
      glow: "bg-red-600/20",
      bg: "bg-red-600/5",
      ring: "border-red-600/30 hover:bg-red-600 hover:border-red-600",
      arrow: "text-red-500 group-hover:text-white",
      line: "bg-red-600/40",
    },
    quickStart: {
      windows: `# In %APPDATA%\\openclaw\\config.yaml
# providers.openai.baseUrl: "${env.apiUrl}/v1"
$env:OPENAI_API_KEY="YOUR_API_KEY"

openclaw onboard`,
      macos: `# In ~/.openclaw/config.yaml
# providers.openai.baseUrl: "${env.apiUrl}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

openclaw onboard`,
      linux: `# In ~/.openclaw/config.yaml
# providers.openai.baseUrl: "${env.apiUrl}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

openclaw onboard`,
    },
  },
] as const satisfies readonly CliIntegrationDef[];

export const rpIntegrations = [
  {
    kind: "rp" as const,
    href: "/docs/sillytavern",
    titleKey: "DOCS.SILLYTAVERN.TITLE",
    subtitleKey: "DOCS.SILLYTAVERN.SUBTITLE",
    badgeKey: "DOCS.SILLYTAVERN.BADGE",
    iconKey: "sillytavern",
    color: {
      accent: "text-pink-500",
      badge: "bg-pink-600 text-white",
      border: "border-pink-600/20",
      glow: "bg-pink-600/20",
      bg: "bg-pink-600/5",
      ring: "border-pink-600/30 hover:bg-pink-600 hover:border-pink-600",
      arrow: "text-pink-500 group-hover:text-white",
      line: "bg-pink-600/40",
    },
    quickConfig: `Base URL: ${env.apiUrl}/v1
API Key:  YOUR_API_KEY`,
  },
  {
    kind: "rp" as const,
    href: "/docs/janitor-ai",
    titleKey: "DOCS.JANITOR_AI.TITLE",
    subtitleKey: "DOCS.JANITOR_AI.SUBTITLE",
    badgeKey: "DOCS.JANITOR_AI.BADGE",
    iconKey: "janitor-ai",
    color: {
      accent: "text-teal-500",
      badge: "bg-teal-600 text-white",
      border: "border-teal-600/20",
      glow: "bg-teal-600/20",
      bg: "bg-teal-600/5",
      ring: "border-teal-600/30 hover:bg-teal-600 hover:border-teal-600",
      arrow: "text-teal-500 group-hover:text-white",
      line: "bg-teal-600/40",
    },
    quickConfig: `Proxy URL: ${env.apiUrl}/v1/chat/completions
API Key:   YOUR_API_KEY`,
  },
  {
    kind: "rp" as const,
    href: "/docs/risuai",
    titleKey: "DOCS.RISUAI.TITLE",
    subtitleKey: "DOCS.RISUAI.SUBTITLE",
    badgeKey: "DOCS.RISUAI.BADGE",
    iconKey: "risuai",
    color: {
      accent: "text-amber-500",
      badge: "bg-amber-600 text-white",
      border: "border-amber-600/20",
      glow: "bg-amber-600/20",
      bg: "bg-amber-600/5",
      ring: "border-amber-600/30 hover:bg-amber-600 hover:border-amber-600",
      arrow: "text-amber-500 group-hover:text-white",
      line: "bg-amber-600/40",
    },
    quickConfig: `Request URL: ${env.apiUrl}/v1/chat/completions
API Key:     YOUR_API_KEY`,
  },
  {
    kind: "rp" as const,
    href: "/docs/chub",
    titleKey: "DOCS.CHUB.TITLE",
    subtitleKey: "DOCS.CHUB.SUBTITLE",
    badgeKey: "DOCS.CHUB.BADGE",
    iconKey: "chub",
    color: {
      accent: "text-rose-500",
      badge: "bg-rose-600 text-white",
      border: "border-rose-600/20",
      glow: "bg-rose-600/20",
      bg: "bg-rose-600/5",
      ring: "border-rose-600/30 hover:bg-rose-600 hover:border-rose-600",
      arrow: "text-rose-500 group-hover:text-white",
      line: "bg-rose-600/40",
    },
    quickConfig: `URL: ${env.apiUrl}/v1/chat/completions
Key: YOUR_API_KEY`,
  },
] as const satisfies readonly RpIntegrationDef[];

/** Backwards-compat flat list. */
export const integrations = [...cliIntegrations, ...rpIntegrations];

export type Integration = IntegrationDef;
