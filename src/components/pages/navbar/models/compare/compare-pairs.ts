import { modelSlug } from "@/lib/utils/base";

// Curated high-volume head-to-head pairs by raw model name. These prerender +
// enter the sitemap so "X vs Y" queries have an indexable page; every other combo
// stays on-demand (generateStaticParams returns these, the route still renders
// arbitrary slugs). A name with no live pricing match is dropped at build/sitemap
// time, so a retired model never emits a dead URL.
export const COMPARE_PAIRS: readonly (readonly [string, string])[] = [
  ["claude-opus-4-8", "gpt-5.5"],
  ["claude-opus-4-8", "gemini-3.1-pro-preview"],
  ["claude-opus-4-8", "grok-4.2"],
  ["claude-opus-4-8", "deepseek-v4-pro"],
  ["claude-opus-4-8", "claude-opus-4-7"],
  ["claude-opus-4-8", "claude-sonnet-4-6"],
  ["claude-opus-4-8", "glm-5.2"],
  ["claude-opus-4-8", "kimi-k2.6"],
  ["claude-opus-4-8", "kimi-k2.7-code"],
  ["claude-opus-4-8", "deepseek-v3.2"],
  ["claude-opus-4-8", "qwen3.7-max"],
  ["claude-opus-4-8", "gpt-5.4"],
  ["claude-sonnet-4-6", "gpt-5.5"],
  ["claude-sonnet-4-6", "gemini-3.5-flash"],
  ["claude-sonnet-4-6", "deepseek-v3.2"],
  ["claude-sonnet-4-6", "kimi-k2.6"],
  ["claude-sonnet-4-6", "glm-5.2"],
  ["gpt-5.5", "gemini-3.1-pro-preview"],
  ["gpt-5.5", "grok-4.2"],
  ["gpt-5.5", "deepseek-v4-pro"],
  ["gpt-5.4", "gpt-5.5"],
  ["gemini-3.1-pro-preview", "grok-4.2"],
  ["gemini-3.1-pro-preview", "deepseek-v4-pro"],
  ["gemini-3.5-flash", "gemini-3.1-flash-lite-preview"],
  ["grok-4.2", "grok-4.1"],
  ["deepseek-v4-pro", "deepseek-v4-flash"],
  ["deepseek-v4-pro", "kimi-k2.6"],
  ["deepseek-v3.2", "glm-5.2"],
  ["kimi-k2.6", "glm-5.2"],
  ["kimi-k2.7-code", "claude-sonnet-4-6"],
  ["glm-5.2", "glm-5.1"],
  ["glm-5.2", "glm-4.6"],
  ["qwen3.7-max", "deepseek-v4-pro"],
] as const;

// Slug tuples for generateStaticParams / sitemap, ordered as authored.
export function comparePairSlugs(): string[][] {
  return COMPARE_PAIRS.map(([a, b]) => [modelSlug(a), modelSlug(b)]);
}
