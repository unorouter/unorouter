import { LaunchContent } from "@/components/pages/blog/posts/2026-04-17-launch-content";
import { AgentReadyContent } from "@/components/pages/blog/posts/2026-04-25-agent-ready-content";
import { ClaudeAuthenticityContent } from "@/components/pages/blog/posts/2026-04-26-claude-authenticity-content";
import { SixInputImageModelsContent } from "@/components/pages/blog/posts/2026-05-18-six-input-image-models-content";
import { DiscordCommunityContent } from "@/components/pages/blog/posts/2026-06-04-discord-community-content";
import { FreeModelsAggregatedContent } from "@/components/pages/blog/posts/2026-06-08-free-models-aggregated-content";
import { UnorouterVsOpenrouterContent } from "@/components/pages/blog/posts/2026-06-10-unorouter-vs-openrouter-content";
import { FeaturedOnContent } from "@/components/pages/blog/posts/2026-06-12-featured-on-content";
import { UnorouterVsLitellmContent } from "@/components/pages/blog/posts/2026-06-17-unorouter-vs-litellm-content";
import { UnorouterVsRisuaiContent } from "@/components/pages/blog/posts/2026-06-19-unorouter-vs-risuai-content";
import { UnorouterVsMegallmContent } from "@/components/pages/blog/posts/2026-06-20-unorouter-vs-megallm-content";
import { UnorouterVsPortkeyContent } from "@/components/pages/blog/posts/2026-06-21-unorouter-vs-portkey-content";
import { UnorouterVsNanoGptContent } from "@/components/pages/blog/posts/2026-06-23-unorouter-vs-nano-gpt-content";
import { BestAiGatewayForSillytavernContent } from "@/components/pages/blog/posts/2026-06-25-best-ai-gateway-for-sillytavern-content";
import { BestOpenrouterAlternatives2026Content } from "@/components/pages/blog/posts/2026-06-27-best-openrouter-alternatives-2026-content";
import { OpenSourceOpenrouterAlternativeContent } from "@/components/pages/blog/posts/2026-07-10-open-source-openrouter-alternative-content";
import { WhatIsAnLlmGatewayContent } from "@/components/pages/blog/posts/2026-06-29-what-is-an-llm-gateway-content";
import { HowToConnectAnyLlmToSillytavernContent } from "@/components/pages/blog/posts/2026-07-01-how-to-connect-any-llm-to-sillytavern-content";
import { HowToConnectUnorouterToNevikaContent } from "@/components/pages/blog/posts/2026-08-01-how-to-connect-unorouter-to-nevika-content";
import { OneApiKeyForClaudeCodeAndRoleplayContent } from "@/components/pages/blog/posts/2026-07-03-one-api-key-for-claude-code-and-roleplay-content";
import { UnorouterVsJanitoraiContent } from "@/components/pages/blog/posts/2026-07-07-unorouter-vs-janitorai-content";
import { UnorouterVsCharacterAiContent } from "@/components/pages/blog/posts/2026-07-09-unorouter-vs-character-ai-content";
import { UnorouterVsSillytavernContent } from "@/components/pages/blog/posts/2026-07-11-unorouter-vs-sillytavern-content";
import { UnorouterVsChubContent } from "@/components/pages/blog/posts/2026-07-14-unorouter-vs-chub-content";
import { UnorouterVsMarinaraContent } from "@/components/pages/blog/posts/2026-07-16-unorouter-vs-marinara-content";
import { UnorouterVsLumiverseContent } from "@/components/pages/blog/posts/2026-07-18-unorouter-vs-lumiverse-content";
import { UnorouterVsLibrechatContent } from "@/components/pages/blog/posts/2026-07-21-unorouter-vs-librechat-content";
import { UnorouterVsOpenWebuiContent } from "@/components/pages/blog/posts/2026-07-23-unorouter-vs-open-webui-content";
import { UnorouterVsAgnaiContent } from "@/components/pages/blog/posts/2026-07-25-unorouter-vs-agnai-content";
import { UnorouterVsSpicychatContent } from "@/components/pages/blog/posts/2026-07-28-unorouter-vs-spicychat-content";
import { ClaudeOpus48Vs46Vs47RoleplayContent } from "@/components/pages/blog/posts/2026-07-30-claude-opus-4-8-vs-4-6-vs-4-7-roleplay-content";
import { BLOG_REGISTRY, type BlogSlug } from "@/i18n/registry";
import { APP_VALUES } from "@/lib/config/constants";
import type {
  BlogPost,
  FaqI18nKey,
  MethodI18nKey,
  TldrI18nKey,
} from "@/lib/types";
import type { useTranslations } from "next-intl";
import type { ComponentType } from "react";

const COMPONENTS: Record<BlogSlug, ComponentType> = {
  launch: LaunchContent,
  "agent-ready": AgentReadyContent,
  "claude-authenticity": ClaudeAuthenticityContent,
  "six-input-image-models": SixInputImageModelsContent,
  "discord-community": DiscordCommunityContent,
  "free-models-aggregated": FreeModelsAggregatedContent,
  "unorouter-vs-openrouter": UnorouterVsOpenrouterContent,
  "featured-on": FeaturedOnContent,
  "unorouter-vs-litellm": UnorouterVsLitellmContent,
  "unorouter-vs-risuai": UnorouterVsRisuaiContent,
  "unorouter-vs-megallm": UnorouterVsMegallmContent,
  "unorouter-vs-portkey": UnorouterVsPortkeyContent,
  "unorouter-vs-nano-gpt": UnorouterVsNanoGptContent,
  "best-ai-gateway-for-sillytavern": BestAiGatewayForSillytavernContent,
  "best-openrouter-alternatives-2026": BestOpenrouterAlternatives2026Content,
  "open-source-openrouter-alternative": OpenSourceOpenrouterAlternativeContent,
  "what-is-an-llm-gateway": WhatIsAnLlmGatewayContent,
  "how-to-connect-unorouter-to-nevika": HowToConnectUnorouterToNevikaContent,
  "how-to-connect-any-llm-to-sillytavern":
    HowToConnectAnyLlmToSillytavernContent,
  "one-api-key-for-claude-code-and-roleplay":
    OneApiKeyForClaudeCodeAndRoleplayContent,
  "unorouter-vs-janitorai": UnorouterVsJanitoraiContent,
  "unorouter-vs-character-ai": UnorouterVsCharacterAiContent,
  "unorouter-vs-sillytavern": UnorouterVsSillytavernContent,
  "unorouter-vs-chub": UnorouterVsChubContent,
  "unorouter-vs-marinara": UnorouterVsMarinaraContent,
  "unorouter-vs-lumiverse": UnorouterVsLumiverseContent,
  "unorouter-vs-librechat": UnorouterVsLibrechatContent,
  "unorouter-vs-open-webui": UnorouterVsOpenWebuiContent,
  "unorouter-vs-agnai": UnorouterVsAgnaiContent,
  "unorouter-vs-spicychat": UnorouterVsSpicychatContent,
  "claude-opus-4-8-vs-4-6-vs-4-7-roleplay": ClaudeOpus48Vs46Vs47RoleplayContent,
};

export const POSTS: BlogPost<BlogSlug>[] = BLOG_REGISTRY.map((entry) => ({
  slug: entry.slug,
  date: entry.date,
  tags: [...entry.tags],
  Component: COMPONENTS[entry.slug],
  i18nKey: entry.i18nKey,
  category: entry.category,
  wordCount: entry.wordCount,
  headings: entry.headings,
  heroImage: "heroImage" in entry ? entry.heroImage : undefined,
}));

export function getAllPostsSorted(): BlogPost<BlogSlug>[] {
  // Build date, not the clock: scheduled posts go live with the first deploy
  // on or after their date, rather than mid-session for whoever is reading.
  const today = process.env.NEXT_PUBLIC_BUILD_DATE ?? "";
  return [...POSTS]
    .filter((p) => p.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Posts carrying the GEO block (TLDR lead + FAQ section + FAQPage schema).
// Gate is flag driven because t.raw is unsupported repo wide. Declared as a
// const tuple, not Set<string>: `${GeoI18nKey}.FAQ_1_Q` then resolves to keys
// that actually exist, so the FAQ lookups typecheck without a cast.
export const GEO_SLUGS = [
  "unorouter-vs-openrouter",
  "best-openrouter-alternatives-2026",
  "open-source-openrouter-alternative",
  "what-is-an-llm-gateway",
  "free-models-aggregated",
] as const;

export type GeoSlug = (typeof GEO_SLUGS)[number];
export const GEO_POSTS: ReadonlySet<string> = new Set(GEO_SLUGS);

// Narrows i18nKey to namespaces that actually have FAQ leaves, which is what
// lets `${key}.FAQ_1_Q` typecheck. The runtime check stays the slug set; the
// type side is derived from the message tree, so the two cannot silently
// disagree about which posts have FAQ copy.
export function faqI18nKey(post: BlogPost): FaqI18nKey | null {
  if (!GEO_POSTS.has(post.slug)) return null;
  return post.i18nKey as FaqI18nKey;
}

export function tldrI18nKey(post: BlogPost): TldrI18nKey | null {
  if (!GEO_POSTS.has(post.slug)) return null;
  return post.i18nKey as TldrI18nKey;
}

export function methodI18nKey(post: BlogPost): MethodI18nKey | null {
  if (!METHOD_POSTS.has(post.slug)) return null;
  return post.i18nKey as MethodI18nKey;
}

// Comparison posts whose competitor facts were verified against the rival's
// actual source code. They render a "how we verified" note (METHOD leaf) that
// turns assertions into checkable provenance.
export const METHOD_POSTS = new Set<string>([
  "unorouter-vs-risuai",
  "unorouter-vs-sillytavern",
  "unorouter-vs-marinara",
  "unorouter-vs-lumiverse",
  "unorouter-vs-librechat",
  "unorouter-vs-open-webui",
  "unorouter-vs-agnai",
]);

export function getPost(slug: string): BlogPost<BlogSlug> | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function getAdjacentPosts(slug: string): {
  prev: BlogPost<BlogSlug> | null;
  next: BlogPost<BlogSlug> | null;
} {
  const sorted = getAllPostsSorted();
  const index = sorted.findIndex((p) => p.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    next: index > 0 ? sorted[index - 1]! : null,
    prev: index < sorted.length - 1 ? sorted[index + 1]! : null,
  };
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost<BlogSlug>[] {
  const current = getPost(slug);
  if (!current) return [];
  const others = POSTS.filter((p) => p.slug !== slug);

  const sameCategory = others.filter((p) => p.category === current.category);
  const byTag = others.filter(
    (p) =>
      p.category !== current.category &&
      p.tags.some((t) => current.tags.includes(t)),
  );

  return [...sameCategory, ...byTag]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function translated(
  t: ReturnType<typeof useTranslations<never>>,
  post: BlogPost,
) {
  return {
    title: t(`${post.i18nKey}.TITLE`, APP_VALUES),
    description: t(`${post.i18nKey}.DESCRIPTION`, APP_VALUES),
    author: t(`${post.i18nKey}.AUTHOR`, APP_VALUES),
  };
}
