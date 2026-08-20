import type { IconName } from "@/lib/config/icon-map";
import type { LinkHref } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import type { OS } from "@/lib/types/enums";
import type { IntegrationColor, IntegrationIconKey } from "./integrations";

export type SetupCategory = "coding" | "roleplay" | "general" | "cli";

export interface SetupCompatibility {
  chatCompletions?: boolean;
  messages?: boolean;
  responses?: boolean;
  streaming?: boolean;
  toolCalling?: boolean;
  images?: boolean;
}

export interface SetupStep {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  code?: { lang: string; value: string };
}

export interface SetupGuide {
  slug: string;
  href: LinkHref;
  i18nPrefix: string;
  kind: "cli" | "rp" | "general";
  category: SetupCategory;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  badgeKey: TranslationKey;
  iconKey: IntegrationIconKey;
  logoSrc?: string;
  logoBg?: boolean;
  logoMono?: boolean;
  color: IntegrationColor;
  baseUrl: string;
  apiPath?: string;
  compatibility: SetupCompatibility;
  recommendedModels: string[];
  steps: SetupStep[];
  gotchaKeys?: TranslationKey[];
  quickStart?: Record<OS, string>;
  quickConfig?: string;
  customComponent?: "cc-switch" | "claude-code";
}

function guideColor(c: string): IntegrationColor {
  return {
    accent: `text-${c}-500`,
    badge: `bg-${c}-600 text-white`,
    border: `border-${c}-600/20`,
    glow: `bg-${c}-600/20`,
    bg: `bg-${c}-600/5`,
    ring: `border-${c}-600/30 hover:bg-${c}-600 hover:border-${c}-600`,
    arrow: `text-${c}-500 group-hover:text-white`,
    line: `bg-${c}-600/40`,
  };
}

export const SETUP_GUIDES: SetupGuide[] = [
  {
    slug: "librechat",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "librechat" },
    },
    i18nPrefix: "DOCS.LIBRECHAT",
    kind: "general",
    category: "general",
    titleKey: "DOCS.LIBRECHAT.TITLE",
    subtitleKey: "DOCS.LIBRECHAT.SUBTITLE",
    badgeKey: "DOCS.LIBRECHAT.BADGE",
    iconKey: "librechat",
    logoSrc: "/icons/librechat.svg",
    color: guideColor("green"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.LIBRECHAT.STEP_1_TITLE",
        bodyKey: "DOCS.LIBRECHAT.STEP_1_DESC",
        code: {
          lang: "yaml",
          value: `endpoints:
  custom:
    - name: '${env.appName}'
      apiKey: '\${UNOROUTER_API_KEY}'
      baseURL: '${env.apiUrl}/v1'
      models:
        fetch: true
      titleConvo: true
      modelDisplayLabel: '${env.appName}'`,
        },
      },
      {
        titleKey: "DOCS.LIBRECHAT.STEP_2_TITLE",
        bodyKey: "DOCS.LIBRECHAT.STEP_2_DESC",
        code: {
          lang: "bash",
          value: `UNOROUTER_API_KEY=YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.LIBRECHAT.STEP_3_TITLE",
        bodyKey: "DOCS.LIBRECHAT.STEP_3_DESC",
      },
    ],
    gotchaKeys: [
      "DOCS.LIBRECHAT.TS_1_DESC",
      "DOCS.LIBRECHAT.TS_2_DESC",
      "DOCS.LIBRECHAT.TS_3_DESC",
    ],
  },
  {
    slug: "open-webui",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "open-webui" },
    },
    i18nPrefix: "DOCS.OPEN_WEBUI",
    kind: "general",
    category: "general",
    titleKey: "DOCS.OPEN_WEBUI.TITLE",
    subtitleKey: "DOCS.OPEN_WEBUI.SUBTITLE",
    badgeKey: "DOCS.OPEN_WEBUI.BADGE",
    iconKey: "open-webui",
    color: guideColor("sky"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.OPEN_WEBUI.STEP_1_TITLE",
        bodyKey: "DOCS.OPEN_WEBUI.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.OPEN_WEBUI.STEP_2_TITLE",
        bodyKey: "DOCS.OPEN_WEBUI.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.OPEN_WEBUI.STEP_3_TITLE",
        bodyKey: "DOCS.OPEN_WEBUI.STEP_3_DESC",
        code: {
          lang: "text",
          value: `OpenAI API Base URL: ${env.apiUrl}/v1
OpenAI API Key: YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.OPEN_WEBUI.STEP_4_TITLE",
        bodyKey: "DOCS.OPEN_WEBUI.STEP_4_DESC",
      },
    ],
    gotchaKeys: ["DOCS.OPEN_WEBUI.TS_1_DESC", "DOCS.OPEN_WEBUI.TS_2_DESC"],
  },
  {
    slug: "lobechat",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "lobechat" },
    },
    i18nPrefix: "DOCS.LOBECHAT",
    kind: "general",
    category: "general",
    titleKey: "DOCS.LOBECHAT.TITLE",
    subtitleKey: "DOCS.LOBECHAT.SUBTITLE",
    badgeKey: "DOCS.LOBECHAT.BADGE",
    iconKey: "lobechat",
    color: guideColor("cyan"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.LOBECHAT.STEP_1_TITLE",
        bodyKey: "DOCS.LOBECHAT.STEP_1_DESC",
        code: {
          lang: "text",
          value: `Provider Name: ${env.appName}
Provider ID: unorouter
Request Format (SDK Type): openai
Proxy URL: ${env.apiUrl}/v1
API Key: YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.LOBECHAT.STEP_2_TITLE",
        bodyKey: "DOCS.LOBECHAT.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.LOBECHAT.STEP_3_TITLE",
        bodyKey: "DOCS.LOBECHAT.STEP_3_DESC",
        code: {
          lang: "bash",
          value: `docker run -e OPENAI_API_KEY=YOUR_API_KEY \\
           -e OPENAI_PROXY_URL=${env.apiUrl}/v1 \\
           lobehub/lobe-chat`,
        },
      },
    ],
    gotchaKeys: ["DOCS.LOBECHAT.TS_1_DESC", "DOCS.LOBECHAT.TS_2_DESC"],
  },
  {
    slug: "anythingllm",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "anythingllm" },
    },
    i18nPrefix: "DOCS.ANYTHINGLLM",
    kind: "general",
    category: "general",
    titleKey: "DOCS.ANYTHINGLLM.TITLE",
    subtitleKey: "DOCS.ANYTHINGLLM.SUBTITLE",
    badgeKey: "DOCS.ANYTHINGLLM.BADGE",
    iconKey: "anythingllm",
    logoSrc: "/icons/anythingllm.svg",
    logoMono: true,
    color: guideColor("purple"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.ANYTHINGLLM.STEP_1_TITLE",
        bodyKey: "DOCS.ANYTHINGLLM.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.ANYTHINGLLM.STEP_2_TITLE",
        bodyKey: "DOCS.ANYTHINGLLM.STEP_2_DESC",
        code: {
          lang: "text",
          value: `Base URL: ${env.apiUrl}/v1
API Key: YOUR_API_KEY
Chat Model Name: YOUR_MODEL_ID
Token context window: 50000`,
        },
      },
      {
        titleKey: "DOCS.ANYTHINGLLM.STEP_3_TITLE",
        bodyKey: "DOCS.ANYTHINGLLM.STEP_3_DESC",
      },
    ],
    gotchaKeys: ["DOCS.ANYTHINGLLM.TS_1_DESC", "DOCS.ANYTHINGLLM.TS_2_DESC"],
  },
  {
    slug: "cherry-studio",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "cherry-studio" },
    },
    i18nPrefix: "DOCS.CHERRY_STUDIO",
    kind: "general",
    category: "general",
    titleKey: "DOCS.CHERRY_STUDIO.TITLE",
    subtitleKey: "DOCS.CHERRY_STUDIO.SUBTITLE",
    badgeKey: "DOCS.CHERRY_STUDIO.BADGE",
    iconKey: "cherry-studio",
    color: guideColor("rose"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.CHERRY_STUDIO.STEP_1_TITLE",
        bodyKey: "DOCS.CHERRY_STUDIO.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.CHERRY_STUDIO.STEP_2_TITLE",
        bodyKey: "DOCS.CHERRY_STUDIO.STEP_2_DESC",
        code: {
          lang: "text",
          value: `Provider Name: ${env.appName}
Provider Type: OpenAI
API Host: ${env.apiUrl}/v1
API Key: YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.CHERRY_STUDIO.STEP_3_TITLE",
        bodyKey: "DOCS.CHERRY_STUDIO.STEP_3_DESC",
      },
    ],
    gotchaKeys: [
      "DOCS.CHERRY_STUDIO.TS_1_DESC",
      "DOCS.CHERRY_STUDIO.TS_2_DESC",
    ],
  },
  {
    slug: "typingmind",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "typingmind" },
    },
    i18nPrefix: "DOCS.TYPINGMIND",
    kind: "general",
    category: "general",
    titleKey: "DOCS.TYPINGMIND.TITLE",
    subtitleKey: "DOCS.TYPINGMIND.SUBTITLE",
    badgeKey: "DOCS.TYPINGMIND.BADGE",
    iconKey: "typingmind",
    logoSrc: "/icons/typingmind.png",
    color: guideColor("blue"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.TYPINGMIND.STEP_1_TITLE",
        bodyKey: "DOCS.TYPINGMIND.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.TYPINGMIND.STEP_2_TITLE",
        bodyKey: "DOCS.TYPINGMIND.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.TYPINGMIND.STEP_3_TITLE",
        bodyKey: "DOCS.TYPINGMIND.STEP_3_DESC",
        code: {
          lang: "text",
          value: `Custom endpoint / Base URL: ${env.apiUrl}/v1
API Key: YOUR_API_KEY
Model ID: YOUR_MODEL_ID`,
        },
      },
      {
        titleKey: "DOCS.TYPINGMIND.STEP_4_TITLE",
        bodyKey: "DOCS.TYPINGMIND.STEP_4_DESC",
      },
    ],
    gotchaKeys: ["DOCS.TYPINGMIND.TS_1_DESC", "DOCS.TYPINGMIND.TS_2_DESC"],
  },
  {
    slug: "boltai",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "boltai" } },
    i18nPrefix: "DOCS.BOLTAI",
    kind: "general",
    category: "general",
    titleKey: "DOCS.BOLTAI.TITLE",
    subtitleKey: "DOCS.BOLTAI.SUBTITLE",
    badgeKey: "DOCS.BOLTAI.BADGE",
    iconKey: "boltai",
    logoSrc: "/icons/boltai.svg",
    logoMono: true,
    color: guideColor("indigo"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.BOLTAI.STEP_1_TITLE",
        bodyKey: "DOCS.BOLTAI.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.BOLTAI.STEP_2_TITLE",
        bodyKey: "DOCS.BOLTAI.STEP_2_DESC",
        code: {
          lang: "text",
          value: `Name: ${env.appName}
Base URL: ${env.apiUrl}/v1
API Key: YOUR_API_KEY
Model ID: YOUR_MODEL_ID
Context Length: 80000`,
        },
      },
      {
        titleKey: "DOCS.BOLTAI.STEP_3_TITLE",
        bodyKey: "DOCS.BOLTAI.STEP_3_DESC",
      },
    ],
    gotchaKeys: ["DOCS.BOLTAI.TS_1_DESC", "DOCS.BOLTAI.TS_2_DESC"],
  },
  {
    slug: "page-assist",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "page-assist" },
    },
    i18nPrefix: "DOCS.PAGE_ASSIST",
    kind: "general",
    category: "general",
    titleKey: "DOCS.PAGE_ASSIST.TITLE",
    subtitleKey: "DOCS.PAGE_ASSIST.SUBTITLE",
    badgeKey: "DOCS.PAGE_ASSIST.BADGE",
    iconKey: "page-assist",
    logoSrc: "/icons/page-assist.png",
    logoMono: true,
    color: guideColor("teal"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.PAGE_ASSIST.STEP_1_TITLE",
        bodyKey: "DOCS.PAGE_ASSIST.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.PAGE_ASSIST.STEP_2_TITLE",
        bodyKey: "DOCS.PAGE_ASSIST.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.PAGE_ASSIST.STEP_3_TITLE",
        bodyKey: "DOCS.PAGE_ASSIST.STEP_3_DESC",
        code: {
          lang: "text",
          value: `Provider Name: ${env.appName}
Base URL: ${env.apiUrl}/v1
API Key: YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.PAGE_ASSIST.STEP_4_TITLE",
        bodyKey: "DOCS.PAGE_ASSIST.STEP_4_DESC",
      },
    ],
    gotchaKeys: ["DOCS.PAGE_ASSIST.TS_1_DESC", "DOCS.PAGE_ASSIST.TS_2_DESC"],
  },
  {
    slug: "chatbox",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "chatbox" },
    },
    i18nPrefix: "DOCS.CHATBOX",
    kind: "general",
    category: "general",
    titleKey: "DOCS.CHATBOX.TITLE",
    subtitleKey: "DOCS.CHATBOX.SUBTITLE",
    badgeKey: "DOCS.CHATBOX.BADGE",
    iconKey: "chatbox",
    logoSrc: "/icons/chatbox.png",
    color: guideColor("fuchsia"),
    baseUrl: env.apiUrl,
    apiPath: "/v1/chat/completions",
    compatibility: {
      chatCompletions: true,
      streaming: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.CHATBOX.STEP_1_TITLE",
        bodyKey: "DOCS.CHATBOX.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.CHATBOX.STEP_2_TITLE",
        bodyKey: "DOCS.CHATBOX.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.CHATBOX.STEP_3_TITLE",
        bodyKey: "DOCS.CHATBOX.STEP_3_DESC",
        code: {
          lang: "text",
          value: `Name: ${env.appName}
API Mode: OpenAI API Compatible
API Host: ${env.apiUrl}
API Path: /v1/chat/completions
API Key: YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.CHATBOX.STEP_4_TITLE",
        bodyKey: "DOCS.CHATBOX.STEP_4_DESC",
      },
    ],
    gotchaKeys: ["DOCS.CHATBOX.TS_1_DESC", "DOCS.CHATBOX.TS_2_DESC"],
  },
  {
    slug: "big-agi",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "big-agi" },
    },
    i18nPrefix: "DOCS.BIG_AGI",
    kind: "general",
    category: "general",
    titleKey: "DOCS.BIG_AGI.TITLE",
    subtitleKey: "DOCS.BIG_AGI.SUBTITLE",
    badgeKey: "DOCS.BIG_AGI.BADGE",
    iconKey: "big-agi",
    logoSrc: "/icons/big-agi.svg",
    logoMono: true,
    color: guideColor("lime"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.BIG_AGI.STEP_1_TITLE",
        bodyKey: "DOCS.BIG_AGI.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.BIG_AGI.STEP_2_TITLE",
        bodyKey: "DOCS.BIG_AGI.STEP_2_DESC",
        code: {
          lang: "text",
          value: `API Key: YOUR_API_KEY
API Endpoint: ${env.apiUrl}/v1`,
        },
      },
      {
        titleKey: "DOCS.BIG_AGI.STEP_3_TITLE",
        bodyKey: "DOCS.BIG_AGI.STEP_3_DESC",
      },
    ],
    gotchaKeys: ["DOCS.BIG_AGI.TS_1_DESC", "DOCS.BIG_AGI.TS_2_DESC"],
  },
  {
    slug: "sillytavern",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "sillytavern" },
    },
    i18nPrefix: "DOCS.SILLYTAVERN",
    kind: "rp",
    category: "roleplay",
    titleKey: "DOCS.SILLYTAVERN.TITLE",
    subtitleKey: "DOCS.SILLYTAVERN.SUBTITLE",
    badgeKey: "DOCS.SILLYTAVERN.BADGE",
    iconKey: "sillytavern",
    color: guideColor("pink"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      messages: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.SILLYTAVERN.STEP_1_TITLE",
        bodyKey: "DOCS.SILLYTAVERN.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.SILLYTAVERN.STEP_2_TITLE",
        bodyKey: "DOCS.SILLYTAVERN.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.SILLYTAVERN.STEP_3_TITLE",
        bodyKey: "DOCS.SILLYTAVERN.STEP_3_DESC",
      },
      {
        titleKey: "DOCS.SILLYTAVERN.STEP_4_TITLE",
        bodyKey: "DOCS.SILLYTAVERN.STEP_4_DESC",
        code: {
          lang: "text",
          value: `Custom Endpoint (Base URL): ${env.apiUrl}/v1`,
        },
      },
      {
        titleKey: "DOCS.SILLYTAVERN.STEP_5_TITLE",
        bodyKey: "DOCS.SILLYTAVERN.STEP_5_DESC",
      },
      {
        titleKey: "DOCS.SILLYTAVERN.STEP_6_TITLE",
        bodyKey: "DOCS.SILLYTAVERN.STEP_6_DESC",
      },
    ],
    gotchaKeys: [
      "DOCS.SILLYTAVERN.GOTCHA_1",
      "DOCS.SILLYTAVERN.GOTCHA_2",
      "DOCS.SILLYTAVERN.GOTCHA_3",
      "DOCS.SILLYTAVERN.GOTCHA_4",
    ],
  },
  {
    slug: "janitor-ai",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "janitor-ai" },
    },
    i18nPrefix: "DOCS.JANITOR_AI",
    kind: "rp",
    category: "roleplay",
    titleKey: "DOCS.JANITOR_AI.TITLE",
    subtitleKey: "DOCS.JANITOR_AI.SUBTITLE",
    badgeKey: "DOCS.JANITOR_AI.BADGE",
    iconKey: "janitor-ai",
    logoSrc: "/icons/janitor-ai.png",
    color: guideColor("teal"),
    baseUrl: `${env.apiUrl}/v1`,
    apiPath: "/chat/completions",
    compatibility: {
      chatCompletions: true,
      streaming: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.JANITOR_AI.STEP_1_TITLE",
        bodyKey: "DOCS.JANITOR_AI.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.JANITOR_AI.STEP_2_TITLE",
        bodyKey: "DOCS.JANITOR_AI.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.JANITOR_AI.STEP_3_TITLE",
        bodyKey: "DOCS.JANITOR_AI.STEP_3_DESC",
        code: {
          lang: "text",
          value: `Proxy URL: ${env.apiUrl}/v1/chat/completions`,
        },
      },
      {
        titleKey: "DOCS.JANITOR_AI.STEP_4_TITLE",
        bodyKey: "DOCS.JANITOR_AI.STEP_4_DESC",
      },
      {
        titleKey: "DOCS.JANITOR_AI.STEP_5_TITLE",
        bodyKey: "DOCS.JANITOR_AI.STEP_5_DESC",
      },
      {
        titleKey: "DOCS.JANITOR_AI.STEP_6_TITLE",
        bodyKey: "DOCS.JANITOR_AI.STEP_6_DESC",
      },
    ],
    gotchaKeys: [
      "DOCS.JANITOR_AI.GOTCHA_1",
      "DOCS.JANITOR_AI.GOTCHA_2",
      "DOCS.JANITOR_AI.GOTCHA_3",
      "DOCS.JANITOR_AI.GOTCHA_4",
      "DOCS.JANITOR_AI.GOTCHA_5",
    ],
  },
  {
    slug: "risuai",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "risuai" } },
    i18nPrefix: "DOCS.RISUAI",
    kind: "rp",
    category: "roleplay",
    titleKey: "DOCS.RISUAI.TITLE",
    subtitleKey: "DOCS.RISUAI.SUBTITLE",
    badgeKey: "DOCS.RISUAI.BADGE",
    iconKey: "risuai",
    logoSrc: "/icons/risuai.png",
    color: guideColor("amber"),
    baseUrl: `${env.apiUrl}/v1`,
    apiPath: "/chat/completions",
    compatibility: {
      chatCompletions: true,
      streaming: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.RISUAI.STEP_1_TITLE",
        bodyKey: "DOCS.RISUAI.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.RISUAI.STEP_2_TITLE",
        bodyKey: "DOCS.RISUAI.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.RISUAI.STEP_3_TITLE",
        bodyKey: "DOCS.RISUAI.STEP_3_DESC",
      },
      {
        titleKey: "DOCS.RISUAI.STEP_4_TITLE",
        bodyKey: "DOCS.RISUAI.STEP_4_DESC",
        code: {
          lang: "text",
          value: `Request URL: ${env.apiUrl}/v1/chat/completions`,
        },
      },
      {
        titleKey: "DOCS.RISUAI.STEP_5_TITLE",
        bodyKey: "DOCS.RISUAI.STEP_5_DESC",
      },
      {
        titleKey: "DOCS.RISUAI.STEP_6_TITLE",
        bodyKey: "DOCS.RISUAI.STEP_6_DESC",
      },
    ],
    gotchaKeys: [
      "DOCS.RISUAI.GOTCHA_1",
      "DOCS.RISUAI.GOTCHA_2",
      "DOCS.RISUAI.GOTCHA_3",
      "DOCS.RISUAI.GOTCHA_4",
    ],
  },
  {
    slug: "chub",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "chub" } },
    i18nPrefix: "DOCS.CHUB",
    kind: "rp",
    category: "roleplay",
    titleKey: "DOCS.CHUB.TITLE",
    subtitleKey: "DOCS.CHUB.SUBTITLE",
    badgeKey: "DOCS.CHUB.BADGE",
    iconKey: "chub",
    logoSrc: "/icons/chub-ai.png",
    logoMono: true,
    color: guideColor("rose"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.CHUB.STEP_1_TITLE",
        bodyKey: "DOCS.CHUB.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.CHUB.STEP_2_TITLE",
        bodyKey: "DOCS.CHUB.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.CHUB.STEP_3_TITLE",
        bodyKey: "DOCS.CHUB.STEP_3_DESC",
        code: {
          lang: "text",
          value: `OpenAI Reverse Proxy: ${env.apiUrl}/v1`,
        },
      },
      {
        titleKey: "DOCS.CHUB.STEP_4_TITLE",
        bodyKey: "DOCS.CHUB.STEP_4_DESC",
      },
      {
        titleKey: "DOCS.CHUB.STEP_5_TITLE",
        bodyKey: "DOCS.CHUB.STEP_5_DESC",
      },
      {
        titleKey: "DOCS.CHUB.STEP_CONFIG_TITLE",
        bodyKey: "DOCS.CHUB.STEP_CONFIG_DESC",
      },
    ],
    gotchaKeys: [
      "DOCS.CHUB.GOTCHA_1",
      "DOCS.CHUB.GOTCHA_2",
      "DOCS.CHUB.GOTCHA_3",
      "DOCS.CHUB.GOTCHA_4",
    ],
  },
  {
    slug: "nevika",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "nevika" } },
    i18nPrefix: "DOCS.NEVIKA",
    kind: "rp",
    category: "roleplay",
    titleKey: "DOCS.NEVIKA.TITLE",
    subtitleKey: "DOCS.NEVIKA.SUBTITLE",
    badgeKey: "DOCS.NEVIKA.BADGE",
    iconKey: "nevika",
    logoSrc: "/icons/nevika.png",
    color: guideColor("violet"),
    baseUrl: `${env.apiUrl}/v1`,
    apiPath: "/chat/completions",
    compatibility: {
      chatCompletions: true,
      streaming: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.NEVIKA.STEP_1_TITLE",
        bodyKey: "DOCS.NEVIKA.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.NEVIKA.STEP_2_TITLE",
        bodyKey: "DOCS.NEVIKA.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.NEVIKA.STEP_3_TITLE",
        bodyKey: "DOCS.NEVIKA.STEP_3_DESC",
        code: {
          lang: "text",
          value: `API Base URL: ${env.apiUrl}/v1
API Key: YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.NEVIKA.STEP_4_TITLE",
        bodyKey: "DOCS.NEVIKA.STEP_4_DESC",
      },
    ],
    gotchaKeys: [
      "DOCS.NEVIKA.GOTCHA_1",
      "DOCS.NEVIKA.GOTCHA_2",
      "DOCS.NEVIKA.GOTCHA_3",
    ],
  },
  {
    slug: "opencode",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "opencode" },
    },
    i18nPrefix: "DOCS.OPENCODE",
    kind: "general",
    category: "coding",
    titleKey: "DOCS.OPENCODE.TITLE",
    subtitleKey: "DOCS.OPENCODE.SUBTITLE",
    badgeKey: "DOCS.OPENCODE.BADGE",
    iconKey: "opencode",
    color: guideColor("cyan"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.OPENCODE.STEP_1_TITLE",
        bodyKey: "DOCS.OPENCODE.STEP_1_DESC",
        code: {
          lang: "text",
          value: "C:/Users/YOUR_USER/.config/opencode/opencode.json",
        },
      },
      {
        titleKey: "DOCS.OPENCODE.STEP_2_TITLE",
        bodyKey: "DOCS.OPENCODE.STEP_2_DESC",
        code: {
          lang: "json",
          value: `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "${env.appName.toLowerCase()}": {
      "name": "${env.appName}",
      "npm": "@ai-sdk/openai-compatible",
      "discoverModels": true,
      "options": {
        "apiKey": "YOUR_API_KEY",
        "baseURL": "${env.apiUrl}/v1"
      }
    }
  }
}`,
        },
      },
      {
        titleKey: "DOCS.OPENCODE.STEP_3_TITLE",
        bodyKey: "DOCS.OPENCODE.STEP_3_DESC",
      },
      {
        titleKey: "DOCS.OPENCODE.STEP_4_TITLE",
        bodyKey: "DOCS.OPENCODE.STEP_4_DESC",
      },
    ],
    gotchaKeys: [
      "DOCS.OPENCODE.GOTCHA_1",
      "DOCS.OPENCODE.GOTCHA_2",
      "DOCS.OPENCODE.GOTCHA_3",
      "DOCS.OPENCODE.GOTCHA_4",
    ],
  },
  {
    slug: "kilo-code",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "kilo-code" },
    },
    i18nPrefix: "DOCS.KILO_CODE",
    kind: "general",
    category: "coding",
    titleKey: "DOCS.KILO_CODE.TITLE",
    subtitleKey: "DOCS.KILO_CODE.SUBTITLE",
    badgeKey: "DOCS.KILO_CODE.BADGE",
    iconKey: "kilo-code",
    color: guideColor("fuchsia"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.KILO_CODE.STEP_1_TITLE",
        bodyKey: "DOCS.KILO_CODE.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.KILO_CODE.STEP_2_TITLE",
        bodyKey: "DOCS.KILO_CODE.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.KILO_CODE.STEP_3_TITLE",
        bodyKey: "DOCS.KILO_CODE.STEP_3_DESC",
      },
      {
        titleKey: "DOCS.KILO_CODE.STEP_4_TITLE",
        bodyKey: "DOCS.KILO_CODE.STEP_4_DESC",
        code: {
          lang: "text",
          value: `Provider Name: ${env.appName}
API URL: ${env.apiUrl}/v1
API Key: YOUR_API_KEY
Model Name: YOUR_MODEL_ID
Supports tools: enabled`,
        },
      },
      {
        titleKey: "DOCS.KILO_CODE.STEP_5_TITLE",
        bodyKey: "DOCS.KILO_CODE.STEP_5_DESC",
      },
    ],
    gotchaKeys: [
      "DOCS.KILO_CODE.GOTCHA_1",
      "DOCS.KILO_CODE.GOTCHA_2",
      "DOCS.KILO_CODE.GOTCHA_3",
    ],
  },
  {
    slug: "zed",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "zed" } },
    i18nPrefix: "DOCS.ZED",
    kind: "general",
    category: "coding",
    titleKey: "DOCS.ZED.TITLE",
    subtitleKey: "DOCS.ZED.SUBTITLE",
    badgeKey: "DOCS.ZED.BADGE",
    iconKey: "zed",
    logoSrc: "/icons/zed.svg",
    logoMono: true,
    color: guideColor("sky"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.ZED.STEP_1_TITLE",
        bodyKey: "DOCS.ZED.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.ZED.STEP_2_TITLE",
        bodyKey: "DOCS.ZED.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.ZED.STEP_3_TITLE",
        bodyKey: "DOCS.ZED.STEP_3_DESC",
        code: {
          lang: "text",
          value: `Provider ID: ${env.appName.toLowerCase()}
Display name: ${env.appName}
Base URL: ${env.apiUrl}/v1
API key: YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.ZED.STEP_4_TITLE",
        bodyKey: "DOCS.ZED.STEP_4_DESC",
      },
    ],
    gotchaKeys: ["DOCS.ZED.GOTCHA_1", "DOCS.ZED.GOTCHA_2"],
  },
  {
    slug: "cline",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "cline" } },
    i18nPrefix: "DOCS.CLINE",
    kind: "general",
    category: "coding",
    titleKey: "DOCS.CLINE.TITLE",
    subtitleKey: "DOCS.CLINE.SUBTITLE",
    badgeKey: "DOCS.CLINE.BADGE",
    iconKey: "cline",
    color: guideColor("blue"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.CLINE.STEP_1_TITLE",
        bodyKey: "DOCS.CLINE.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.CLINE.STEP_2_TITLE",
        bodyKey: "DOCS.CLINE.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.CLINE.STEP_3_TITLE",
        bodyKey: "DOCS.CLINE.STEP_3_DESC",
      },
      {
        titleKey: "DOCS.CLINE.STEP_4_TITLE",
        bodyKey: "DOCS.CLINE.STEP_4_DESC",
        code: {
          lang: "text",
          value: `Base URL: ${env.apiUrl}/v1
API Key: YOUR_API_KEY
Model ID: YOUR_MODEL_ID`,
        },
      },
    ],
    gotchaKeys: ["DOCS.CLINE.GOTCHA_1", "DOCS.CLINE.GOTCHA_2"],
  },
  {
    slug: "roo-code",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "roo-code" },
    },
    i18nPrefix: "DOCS.ROO_CODE",
    kind: "general",
    category: "coding",
    titleKey: "DOCS.ROO_CODE.TITLE",
    subtitleKey: "DOCS.ROO_CODE.SUBTITLE",
    badgeKey: "DOCS.ROO_CODE.BADGE",
    iconKey: "roo-code",
    color: guideColor("orange"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.ROO_CODE.STEP_1_TITLE",
        bodyKey: "DOCS.ROO_CODE.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.ROO_CODE.STEP_2_TITLE",
        bodyKey: "DOCS.ROO_CODE.STEP_2_DESC",
      },
      {
        titleKey: "DOCS.ROO_CODE.STEP_3_TITLE",
        bodyKey: "DOCS.ROO_CODE.STEP_3_DESC",
      },
      {
        titleKey: "DOCS.ROO_CODE.STEP_4_TITLE",
        bodyKey: "DOCS.ROO_CODE.STEP_4_DESC",
        code: {
          lang: "text",
          value: `Base URL: ${env.apiUrl}/v1
API Key: YOUR_API_KEY
Model: YOUR_MODEL_ID`,
        },
      },
    ],
    gotchaKeys: ["DOCS.ROO_CODE.GOTCHA_1", "DOCS.ROO_CODE.GOTCHA_2"],
  },
  {
    slug: "continue-dev",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "continue-dev" },
    },
    i18nPrefix: "DOCS.CONTINUE_DEV",
    kind: "general",
    category: "coding",
    titleKey: "DOCS.CONTINUE_DEV.TITLE",
    subtitleKey: "DOCS.CONTINUE_DEV.SUBTITLE",
    badgeKey: "DOCS.CONTINUE_DEV.BADGE",
    iconKey: "continue-dev",
    logoSrc: "/icons/continue-dev.svg",
    color: guideColor("slate"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.CONTINUE_DEV.STEP_1_TITLE",
        bodyKey: "DOCS.CONTINUE_DEV.STEP_1_DESC",
      },
      {
        titleKey: "DOCS.CONTINUE_DEV.STEP_2_TITLE",
        bodyKey: "DOCS.CONTINUE_DEV.STEP_2_DESC",
        code: {
          lang: "yaml",
          value: `models:
  - name: ${env.appName} model
    provider: openai
    model: YOUR_MODEL_ID
    apiBase: ${env.apiUrl}/v1
    apiKey: YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.CONTINUE_DEV.STEP_3_TITLE",
        bodyKey: "DOCS.CONTINUE_DEV.STEP_3_DESC",
      },
    ],
    gotchaKeys: ["DOCS.CONTINUE_DEV.GOTCHA_1", "DOCS.CONTINUE_DEV.GOTCHA_2"],
  },
  {
    slug: "aider",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "aider" } },
    i18nPrefix: "DOCS.AIDER",
    kind: "cli",
    category: "cli",
    titleKey: "DOCS.AIDER.TITLE",
    subtitleKey: "DOCS.AIDER.SUBTITLE",
    badgeKey: "DOCS.AIDER.BADGE",
    iconKey: "aider",
    logoSrc: "/icons/aider.svg",
    color: guideColor("green"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.AIDER.STEP_1_TITLE",
        bodyKey: "DOCS.AIDER.STEP_1_DESC",
        code: {
          lang: "bash",
          value: `export OPENAI_API_BASE=${env.apiUrl}/v1
export OPENAI_API_KEY=YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.AIDER.STEP_2_TITLE",
        bodyKey: "DOCS.AIDER.STEP_2_DESC",
        code: {
          lang: "bash",
          value: "aider --model openai/YOUR_MODEL_ID",
        },
      },
      {
        titleKey: "DOCS.AIDER.STEP_3_TITLE",
        bodyKey: "DOCS.AIDER.STEP_3_DESC",
        code: {
          lang: "yaml",
          value: `openai-api-base: ${env.apiUrl}/v1
openai-api-key: YOUR_API_KEY
model: openai/YOUR_MODEL_ID`,
        },
      },
    ],
    gotchaKeys: ["DOCS.AIDER.GOTCHA_1", "DOCS.AIDER.GOTCHA_2"],
  },
  {
    slug: "cc-switch",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "cc-switch" },
    },
    i18nPrefix: "DOCS.CC_SWITCH",
    kind: "cli",
    category: "cli",
    titleKey: "DOCS.CC_SWITCH.TITLE",
    subtitleKey: "DOCS.CC_SWITCH.SUBTITLE",
    badgeKey: "DOCS.CC_SWITCH.BADGE",
    iconKey: "cc-switch",
    logoSrc: "/icons/cc-switch.png",
    color: guideColor("violet"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      messages: true,
      responses: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [],
    customComponent: "cc-switch",
  },
  {
    slug: "claude-code",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "claude-code" },
    },
    i18nPrefix: "DOCS.CLAUDE_CODE",
    kind: "cli",
    category: "cli",
    titleKey: "DOCS.CLAUDE_CODE.TITLE",
    subtitleKey: "DOCS.CLAUDE_CODE.SUBTITLE",
    badgeKey: "DOCS.CLAUDE_CODE.BADGE",
    iconKey: "claude-code",
    color: guideColor("orange"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      messages: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [],
    customComponent: "claude-code",
  },
  {
    slug: "codex",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "codex" } },
    i18nPrefix: "DOCS.CODEX",
    kind: "cli",
    category: "cli",
    titleKey: "DOCS.CODEX.TITLE",
    subtitleKey: "DOCS.CODEX.SUBTITLE",
    badgeKey: "DOCS.CODEX.BADGE",
    iconKey: "codex",
    color: guideColor("emerald"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      responses: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.CODEX.STEP_1_TITLE",
        bodyKey: "DOCS.CODEX.STEP_1_DESC",
        code: { lang: "bash", value: "npm install -g @openai/codex" },
      },
      {
        titleKey: "DOCS.CODEX.STEP_2_TITLE",
        bodyKey: "DOCS.CODEX.STEP_2_DESC",
        code: {
          lang: "toml",
          value: `# ~/.codex/config.toml
model = "YOUR_MODEL_ID"
model_provider = "unorouter"

[model_providers.unorouter]
name = "UnoRouter"
base_url = "${env.apiUrl}/v1"
wire_api = "responses"`,
        },
      },
      {
        titleKey: "DOCS.CODEX.STEP_3_TITLE",
        bodyKey: "DOCS.CODEX.STEP_3_DESC",
        code: {
          lang: "json",
          value: `// ~/.codex/auth.json
{
  "OPENAI_API_KEY": "YOUR_API_KEY"
}`,
        },
      },
      {
        titleKey: "DOCS.CODEX.STEP_4_TITLE",
        bodyKey: "DOCS.CODEX.STEP_4_DESC",
        code: { lang: "bash", value: "codex" },
      },
    ],
    gotchaKeys: [
      "DOCS.CODEX.TS_1_DESC",
      "DOCS.CODEX.TS_2_DESC",
      "DOCS.CODEX.TS_3_DESC",
    ],
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
    slug: "gemini-cli",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "gemini-cli" },
    },
    i18nPrefix: "DOCS.GEMINI_CLI",
    kind: "cli",
    category: "cli",
    titleKey: "DOCS.GEMINI_CLI.TITLE",
    subtitleKey: "DOCS.GEMINI_CLI.SUBTITLE",
    badgeKey: "DOCS.GEMINI_CLI.BADGE",
    iconKey: "gemini",
    color: guideColor("blue"),
    baseUrl: env.apiUrl,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
      images: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.GEMINI_CLI.STEP_1_TITLE",
        bodyKey: "DOCS.GEMINI_CLI.STEP_1_DESC",
        code: { lang: "bash", value: "npm install -g @google/gemini-cli" },
      },
      {
        titleKey: "DOCS.GEMINI_CLI.STEP_2_TITLE",
        bodyKey: "DOCS.GEMINI_CLI.STEP_2_DESC",
        code: {
          lang: "bash",
          value: `# ~/.gemini/.env
GEMINI_API_KEY=YOUR_API_KEY
GOOGLE_GEMINI_BASE_URL=${env.apiUrl}`,
        },
      },
      {
        titleKey: "DOCS.GEMINI_CLI.STEP_3_TITLE",
        bodyKey: "DOCS.GEMINI_CLI.STEP_3_DESC",
        code: { lang: "bash", value: "gemini" },
      },
    ],
    gotchaKeys: ["DOCS.GEMINI_CLI.TS_1_DESC", "DOCS.GEMINI_CLI.TS_2_DESC"],
    quickStart: {
      windows: `$env:GEMINI_API_KEY="YOUR_API_KEY"
$env:GOOGLE_GEMINI_BASE_URL="${env.apiUrl}"

gemini`,
      macos: `export GEMINI_API_KEY="YOUR_API_KEY"
export GOOGLE_GEMINI_BASE_URL="${env.apiUrl}"

gemini`,
      linux: `export GEMINI_API_KEY="YOUR_API_KEY"
export GOOGLE_GEMINI_BASE_URL="${env.apiUrl}"

gemini`,
    },
  },
  {
    slug: "openclaw",
    href: {
      pathname: "/docs/integrations/[slug]",
      params: { slug: "openclaw" },
    },
    i18nPrefix: "DOCS.OPENCLAW",
    kind: "cli",
    category: "cli",
    titleKey: "DOCS.OPENCLAW.TITLE",
    subtitleKey: "DOCS.OPENCLAW.SUBTITLE",
    badgeKey: "DOCS.OPENCLAW.BADGE",
    iconKey: "openclaw",
    logoSrc: "/icons/openclaw.svg",
    color: guideColor("red"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.OPENCLAW.STEP_1_TITLE",
        bodyKey: "DOCS.OPENCLAW.STEP_1_DESC",
        code: {
          lang: "bash",
          value: `npm install -g openclaw@latest
openclaw onboard`,
        },
      },
      {
        titleKey: "DOCS.OPENCLAW.STEP_2_TITLE",
        bodyKey: "DOCS.OPENCLAW.STEP_2_DESC",
        code: {
          lang: "json",
          value: `// ~/.openclaw/config.json
{
  "env": { "OPENAI_API_KEY": "YOUR_API_KEY" },
  "agents": {
    "defaults": { "model": { "primary": "openai/YOUR_MODEL_ID" } }
  },
  "providers": {
    "openai": {
      "baseUrl": "${env.apiUrl}/v1",
      "apiKey": "env:OPENAI_API_KEY"
    }
  }
}`,
        },
      },
      {
        titleKey: "DOCS.OPENCLAW.STEP_3_TITLE",
        bodyKey: "DOCS.OPENCLAW.STEP_3_DESC",
        code: { lang: "bash", value: "openclaw start" },
      },
    ],
    gotchaKeys: ["DOCS.OPENCLAW.TS_1_DESC", "DOCS.OPENCLAW.TS_2_DESC"],
    quickStart: {
      windows: `# In %APPDATA%\\openclaw\\config.json set
# providers.openai.baseUrl to "${env.apiUrl}/v1"
$env:OPENAI_API_KEY="YOUR_API_KEY"

openclaw onboard`,
      macos: `# In ~/.openclaw/config.json set
# providers.openai.baseUrl to "${env.apiUrl}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

openclaw onboard`,
      linux: `# In ~/.openclaw/config.json set
# providers.openai.baseUrl to "${env.apiUrl}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

openclaw onboard`,
    },
  },
  {
    slug: "hermes",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "hermes" } },
    i18nPrefix: "DOCS.HERMES",
    kind: "cli",
    category: "cli",
    titleKey: "DOCS.HERMES.TITLE",
    subtitleKey: "DOCS.HERMES.SUBTITLE",
    badgeKey: "DOCS.HERMES.BADGE",
    iconKey: "hermes",
    color: guideColor("indigo"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
      streaming: true,
      toolCalling: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.HERMES.STEP_1_TITLE",
        bodyKey: "DOCS.HERMES.STEP_1_DESC",
        code: {
          lang: "bash",
          value: `curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash`,
        },
      },
      {
        titleKey: "DOCS.HERMES.STEP_2_TITLE",
        bodyKey: "DOCS.HERMES.STEP_2_DESC",
        code: {
          lang: "yaml",
          value: `# ~/.hermes/config.yaml
model:
  provider: "custom"
  base_url: "${env.apiUrl}/v1"
  default: "YOUR_MODEL_ID"`,
        },
      },
      {
        titleKey: "DOCS.HERMES.STEP_3_TITLE",
        bodyKey: "DOCS.HERMES.STEP_3_DESC",
        code: {
          lang: "bash",
          value: `# ~/.hermes/.env
OPENAI_API_KEY=YOUR_API_KEY`,
        },
      },
      {
        titleKey: "DOCS.HERMES.STEP_4_TITLE",
        bodyKey: "DOCS.HERMES.STEP_4_DESC",
        code: { lang: "bash", value: "hermes --tui" },
      },
    ],
    gotchaKeys: ["DOCS.HERMES.TS_1_DESC", "DOCS.HERMES.TS_2_DESC"],
    quickStart: {
      windows: `# Hermes runs under WSL2 on Windows.
# In ~/.hermes/config.yaml set model.provider: "custom"
# and model.base_url: "${env.apiUrl}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

hermes --tui`,
      macos: `curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# In ~/.hermes/config.yaml set model.provider: "custom"
# and model.base_url: "${env.apiUrl}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

hermes --tui`,
      linux: `curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# In ~/.hermes/config.yaml set model.provider: "custom"
# and model.base_url: "${env.apiUrl}/v1"
export OPENAI_API_KEY="YOUR_API_KEY"

hermes --tui`,
    },
  },
  {
    slug: "mcp",
    href: { pathname: "/docs/integrations/[slug]", params: { slug: "mcp" } },
    i18nPrefix: "DOCS.MCP",
    kind: "cli",
    category: "cli",
    titleKey: "DOCS.MCP.TITLE",
    subtitleKey: "DOCS.MCP.SUBTITLE",
    badgeKey: "DOCS.MCP.BADGE",
    iconKey: "mcp",
    color: guideColor("purple"),
    baseUrl: `${env.apiUrl}/v1`,
    compatibility: {
      chatCompletions: true,
    },
    recommendedModels: [],
    steps: [
      {
        titleKey: "DOCS.MCP.STEP_1_TITLE",
        bodyKey: "DOCS.MCP.STEP_1_DESC",
        code: {
          lang: "bash",
          value: `UNOROUTER_API_KEY=YOUR_API_KEY
UNOROUTER_BASE_URL=${env.apiUrl}/v1`,
        },
      },
      {
        titleKey: "DOCS.MCP.STEP_2_TITLE",
        bodyKey: "DOCS.MCP.STEP_2_DESC",
        code: {
          lang: "json",
          value: `{
  "mcpServers": {
    "unorouter": {
      "command": "npx",
      "args": ["-y", "unorouter-mcp"],
      "env": { "UNOROUTER_API_KEY": "YOUR_API_KEY" }
    }
  }
}`,
        },
      },
      {
        titleKey: "DOCS.MCP.STEP_3_TITLE",
        bodyKey: "DOCS.MCP.STEP_3_DESC",
        code: {
          lang: "bash",
          value:
            "claude mcp add unorouter -e UNOROUTER_API_KEY=YOUR_API_KEY -- npx -y unorouter-mcp",
        },
      },
      {
        titleKey: "DOCS.MCP.STEP_4_TITLE",
        bodyKey: "DOCS.MCP.STEP_4_DESC",
        code: {
          lang: "text",
          value: `search_models  filter the live catalog (free_only option)
get_pricing    USD list prices per 1M tokens
chat           send a prompt to any model`,
        },
      },
    ],
    gotchaKeys: ["DOCS.MCP.GOTCHA_1", "DOCS.MCP.GOTCHA_2", "DOCS.MCP.GOTCHA_3"],
  },
];

export const CATEGORY_ORDER: SetupCategory[] = [
  "coding",
  "roleplay",
  "general",
  "cli",
];

export const CATEGORY_LABELS: Record<SetupCategory, TranslationKey> = {
  coding: "DOCS.SETUP_GUIDE.CATEGORY_CODING",
  roleplay: "DOCS.SETUP_GUIDE.CATEGORY_ROLEPLAY",
  general: "DOCS.SETUP_GUIDE.CATEGORY_GENERAL",
  cli: "DOCS.SETUP_GUIDE.CATEGORY_CLI",
};

export const CATEGORY_ICONS: Record<SetupCategory, IconName> = {
  coding: "code",
  roleplay: "drama",
  general: "message-circle",
  cli: "terminal",
};

export const CATEGORY_DESCRIPTIONS: Record<SetupCategory, TranslationKey> = {
  coding: "DOCS.SETUP_GUIDE.CATEGORY_CODING_DESC",
  roleplay: "DOCS.SETUP_GUIDE.CATEGORY_ROLEPLAY_DESC",
  general: "DOCS.SETUP_GUIDE.CATEGORY_GENERAL_DESC",
  cli: "DOCS.SETUP_GUIDE.CATEGORY_CLI_DESC",
};

export function setupGuidesByCategory(): Record<SetupCategory, SetupGuide[]> {
  const buckets: Record<SetupCategory, SetupGuide[]> = {
    coding: [],
    roleplay: [],
    general: [],
    cli: [],
  };
  for (const guide of SETUP_GUIDES) buckets[guide.category].push(guide);
  return buckets;
}

export function getSetupGuide(slug: string): SetupGuide | undefined {
  return SETUP_GUIDES.find((g) => g.slug === slug);
}
