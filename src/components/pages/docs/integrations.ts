import { TranslationKey } from "@/lib/config/constants";

type IntegrationDef = {
  href: string;
  image: string;
  alt: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  badgeKey: TranslationKey;
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
    href: "/docs/claude-code",
    image: "/images/claude-code-screenshot.png",
    alt: "Claude Code",
    titleKey: "DOCS.CLAUDE_CODE.TITLE",
    subtitleKey: "DOCS.CLAUDE_CODE.SUBTITLE",
    badgeKey: "DOCS.CLAUDE_CODE.BADGE",
    color: {
      accent: "text-orange-500",
      badge: "bg-orange-600/20 text-orange-500",
      border: "border-orange-600/20",
      glow: "bg-orange-600/20",
      bg: "bg-orange-600/5",
      ring: "border-orange-600/30 hover:bg-orange-600 hover:border-orange-600",
      arrow: "text-orange-500 group-hover:text-white",
      line: "bg-orange-600/40"
    },
    quickStart: `export ANTHROPIC_BASE_URL="https://api.unorouter.ai"
export ANTHROPIC_API_KEY="YOUR_UNOROUTER_API_KEY"

claude`
  },
  {
    href: "/docs/codex",
    image: "/images/codex-screenshot.png",
    alt: "Codex CLI",
    titleKey: "DOCS.CODEX.TITLE",
    subtitleKey: "DOCS.CODEX.SUBTITLE",
    badgeKey: "DOCS.CODEX.BADGE",
    color: {
      accent: "text-emerald-500",
      badge: "bg-emerald-600/20 text-emerald-500",
      border: "border-emerald-600/20",
      glow: "bg-emerald-600/20",
      bg: "bg-emerald-600/5",
      ring: "border-emerald-600/30 hover:bg-emerald-600 hover:border-emerald-600",
      arrow: "text-emerald-500 group-hover:text-white",
      line: "bg-emerald-600/40"
    },
    quickStart: `export OPENAI_BASE_URL="https://api.unorouter.ai/v1"
export OPENAI_API_KEY="YOUR_UNOROUTER_API_KEY"

codex`
  },
  {
    href: "/docs/gemini-cli",
    image: "/images/gemini-cli-screenshot.png",
    alt: "Gemini CLI",
    titleKey: "DOCS.GEMINI_CLI.TITLE",
    subtitleKey: "DOCS.GEMINI_CLI.SUBTITLE",
    badgeKey: "DOCS.GEMINI_CLI.BADGE",
    color: {
      accent: "text-blue-500",
      badge: "bg-blue-600/20 text-blue-500",
      border: "border-blue-600/20",
      glow: "bg-blue-600/20",
      bg: "bg-blue-600/5",
      ring: "border-blue-600/30 hover:bg-blue-600 hover:border-blue-600",
      arrow: "text-blue-500 group-hover:text-white",
      line: "bg-blue-600/40"
    },
    quickStart: `export GEMINI_API_BASE="https://api.unorouter.ai"
export GEMINI_API_KEY="YOUR_UNOROUTER_API_KEY"

gemini`
  },
  {
    href: "/docs/openclaw",
    image: "/images/openclaw-screenshot.png",
    alt: "OpenClaw",
    titleKey: "DOCS.OPENCLAW.TITLE",
    subtitleKey: "DOCS.OPENCLAW.SUBTITLE",
    badgeKey: "DOCS.OPENCLAW.BADGE",
    color: {
      accent: "text-red-500",
      badge: "bg-red-600/20 text-red-500",
      border: "border-red-600/20",
      glow: "bg-red-600/20",
      bg: "bg-red-600/5",
      ring: "border-red-600/30 hover:bg-red-600 hover:border-red-600",
      arrow: "text-red-500 group-hover:text-white",
      line: "bg-red-600/40"
    },
    quickStart: `# In ~/.openclaw/config.yaml
# providers.openai.baseUrl: "https://api.unorouter.ai/v1"
export OPENAI_API_KEY="YOUR_UNOROUTER_API_KEY"

openclaw onboard`
  }
] as const satisfies readonly IntegrationDef[];

export type Integration = (typeof integrations)[number];
