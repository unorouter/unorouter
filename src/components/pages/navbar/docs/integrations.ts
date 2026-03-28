import { TranslationKey } from "@/lib/config/constants";

export type IntegrationIconKey =
  | "cc-switch"
  | "claude-code"
  | "codex"
  | "gemini"
  | "openclaw";

type IntegrationDef = {
  href: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  badgeKey: TranslationKey;
  iconKey: IntegrationIconKey;
  color: {
    accent: string;
    badge: string;
    border: string;
    glow: string;
    bg: string;
    ring: string;
    arrow: string;
    line: string;
  };
  quickStart: string;
};

export const integrations = [
  {
    href: "/docs/cc-switch",
    titleKey: "DOCS.CC_SWITCH.TITLE",
    subtitleKey: "DOCS.CC_SWITCH.SUBTITLE",
    badgeKey: "DOCS.CC_SWITCH.BADGE",
    iconKey: "cc-switch",
    color: {
      accent: "text-violet-500",
      badge: "bg-violet-600/20 text-violet-500",
      border: "border-violet-600/20",
      glow: "bg-violet-600/20",
      bg: "bg-violet-600/5",
      ring: "border-violet-600/30 hover:bg-violet-600 hover:border-violet-600",
      arrow: "text-violet-500 group-hover:text-white",
      line: "bg-violet-600/40",
    },
    quickStart: `brew tap farion1231/ccswitch
brew install --cask cc-switch`,
  },
  {
    href: "/docs/claude-code",
    titleKey: "DOCS.CLAUDE_CODE.TITLE",
    subtitleKey: "DOCS.CLAUDE_CODE.SUBTITLE",
    badgeKey: "DOCS.CLAUDE_CODE.BADGE",
    iconKey: "claude-code",
    color: {
      accent: "text-orange-500",
      badge: "bg-orange-600/20 text-orange-500",
      border: "border-orange-600/20",
      glow: "bg-orange-600/20",
      bg: "bg-orange-600/5",
      ring: "border-orange-600/30 hover:bg-orange-600 hover:border-orange-600",
      arrow: "text-orange-500 group-hover:text-white",
      line: "bg-orange-600/40",
    },
    quickStart: `export ANTHROPIC_BASE_URL="${process.env.NEXT_PUBLIC_API_URL}"
export ANTHROPIC_API_KEY="YOUR_API_KEY"

claude`,
  },
  {
    href: "/docs/codex",
    titleKey: "DOCS.CODEX.TITLE",
    subtitleKey: "DOCS.CODEX.SUBTITLE",
    badgeKey: "DOCS.CODEX.BADGE",
    iconKey: "codex",
    color: {
      accent: "text-emerald-500",
      badge: "bg-emerald-600/20 text-emerald-500",
      border: "border-emerald-600/20",
      glow: "bg-emerald-600/20",
      bg: "bg-emerald-600/5",
      ring: "border-emerald-600/30 hover:bg-emerald-600 hover:border-emerald-600",
      arrow: "text-emerald-500 group-hover:text-white",
      line: "bg-emerald-600/40",
    },
    quickStart: `export OPENAI_BASE_URL="${process.env.NEXT_PUBLIC_API_URL}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

codex`,
  },
  {
    href: "/docs/gemini-cli",
    titleKey: "DOCS.GEMINI_CLI.TITLE",
    subtitleKey: "DOCS.GEMINI_CLI.SUBTITLE",
    badgeKey: "DOCS.GEMINI_CLI.BADGE",
    iconKey: "gemini",
    color: {
      accent: "text-blue-500",
      badge: "bg-blue-600/20 text-blue-500",
      border: "border-blue-600/20",
      glow: "bg-blue-600/20",
      bg: "bg-blue-600/5",
      ring: "border-blue-600/30 hover:bg-blue-600 hover:border-blue-600",
      arrow: "text-blue-500 group-hover:text-white",
      line: "bg-blue-600/40",
    },
    quickStart: `export GEMINI_API_BASE="${process.env.NEXT_PUBLIC_API_URL}"
export GEMINI_API_KEY="YOUR_API_KEY"

gemini`,
  },
  {
    href: "/docs/openclaw",
    titleKey: "DOCS.OPENCLAW.TITLE",
    subtitleKey: "DOCS.OPENCLAW.SUBTITLE",
    badgeKey: "DOCS.OPENCLAW.BADGE",
    iconKey: "openclaw",
    color: {
      accent: "text-red-500",
      badge: "bg-red-600/20 text-red-500",
      border: "border-red-600/20",
      glow: "bg-red-600/20",
      bg: "bg-red-600/5",
      ring: "border-red-600/30 hover:bg-red-600 hover:border-red-600",
      arrow: "text-red-500 group-hover:text-white",
      line: "bg-red-600/40",
    },
    quickStart: `# In ~/.openclaw/config.yaml
# providers.openai.baseUrl: "${process.env.NEXT_PUBLIC_API_URL}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

openclaw onboard`,
  },
] as const satisfies readonly IntegrationDef[];

export type Integration = (typeof integrations)[number];
