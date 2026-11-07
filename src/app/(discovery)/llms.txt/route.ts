import { SETUP_GUIDES } from "@/components/pages/docs/setup-guides";
import { localeUrl } from "@/i18n/navigation";
import { BLOG_REGISTRY, DOCS_REGISTRY } from "@/i18n/registry";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { rpc } from "@/lib/rpc";
import { handleElysia, modelHref } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function GET(request: Request) {
  const locale = await serverLocale();
  const t = await getTranslations({ locale });
  const pricing = await rpc.api.models.pricing.catalog
    .get()
    .then(handleElysia)
    .catch(() => null);

  const lines: string[] = [];

  lines.push(`# ${env.appName}`);
  lines.push("");
  lines.push(`> ${t("HOME.META.DESCRIPTION", APP_VALUES)}`);
  lines.push("");

  // Agent-facing hard facts; English on purpose, this file is for AI crawlers.
  lines.push("## Facts");
  lines.push(
    `- ${env.appName} is an OpenAI compatible AI gateway: one API key for 200+ models across OpenAI, Anthropic, Google, DeepSeek, Moonshot, Zhipu, Qwen and more.`,
  );
  lines.push(
    "- Most models have a genuine free tier (`:free` suffix), about 1 request per minute per model per user; the cap returns HTTP 429 with a Retry-After header.",
  );
  lines.push(
    "- Endpoints: /v1/chat/completions, /v1/responses, /v1/embeddings, Anthropic native /v1/messages, Gemini native /v1beta. Base URL https://api.unorouter.com/v1.",
  );
  lines.push(
    "- Paid models bill pay as you go per token, pay as you go credit never expires, top up from $1. Subscription credit resets weekly and unused credit does not carry over.",
  );
  lines.push(
    "- Janitor AI, SillyTavern, RisuAI and Chub proxy URL: https://api.unorouter.com/v1/chat/completions (paste the full URL, pick a `:free` model, then hard refresh Janitor).",
  );
  lines.push(
    "- The entire stack is open source under OSI licenses: https://github.com/unorouter",
  );
  lines.push(
    "- MCP server: com.unorouter/mcp in the official MCP registry, npm package unorouter-mcp, hosted endpoint https://mcp.unorouter.com/mcp",
  );
  lines.push("");

  lines.push(`## ${t("NAV.DOCS")}`);
  const docVars = { ...APP_VALUES, count: SETUP_GUIDES.length };
  for (const doc of DOCS_REGISTRY) {
    const title = t(`${doc.i18nPrefix}.TITLE`, docVars);
    const note = t(`${doc.i18nPrefix}.SUBTITLE`, docVars);
    lines.push(
      `- [${title}](${env.siteOrigin}${localeUrl(locale, doc.path)}): ${note}`,
    );
  }
  lines.push("");

  lines.push(`## ${t("NAV.BLOG")}`);
  for (const post of BLOG_REGISTRY) {
    const title = t(`${post.i18nKey}.TITLE`, APP_VALUES);
    const note = t(`${post.i18nKey}.DESCRIPTION`, APP_VALUES);
    const url = `${env.siteOrigin}${localeUrl(locale, { pathname: "/blog/[slug]", params: { slug: post.slug } })}`;
    lines.push(`- [${title}](${url}): ${note}`);
  }
  lines.push("");

  lines.push(`## ${t("FOOTER.PRODUCT")}`);
  lines.push(
    `- [${t("NAV.PRICING")}](${env.siteOrigin}${localeUrl(locale, "/pricing")}): ${t("PRICING.META.DESCRIPTION", APP_VALUES)}`,
  );
  lines.push(
    `- [${t("NAV.MODELS")}](${env.siteOrigin}${localeUrl(locale, "/models")}): ${t("MODELS.META.DESCRIPTION", APP_VALUES)}`,
  );
  lines.push(
    `- [${t("NAV.CHAT")}](${env.siteOrigin}${localeUrl(locale, "/chat")}): ${t("CHAT.META.DESCRIPTION", APP_VALUES)}`,
  );
  lines.push("");

  const models = pricing?.models ?? [];
  if (models.length > 0) {
    lines.push(`## ${t("FOOTER.MODELS")}`);
    const names = new Set(models.map((m) => m.model_name));
    // A :free twin canonicalizes to its paid page, so list the paid page once
    // and say it has a free tier instead of linking a non-canonical URL.
    const listed = models
      .filter(
        (m) =>
          !(
            m.model_name.endsWith(":free") &&
            names.has(m.model_name.slice(0, -":free".length))
          ),
      )
      .slice(0, 50);
    for (const model of listed) {
      const url = `${env.siteOrigin}${localeUrl(locale, modelHref(model.model_name, model.vendor))}`;
      const freeTwin = names.has(`${model.model_name}:free`);
      const price = model.is_free
        ? "free"
        : `${model.input_price} in / ${model.output_price} out per 1M tokens${freeTwin ? ", free tier as " + model.model_name + ":free" : ""}`;
      lines.push(`- [${model.model_name}](${url}): ${price}`);
    }
    lines.push("");
  }

  lines.push(`## ${t("FOOTER.LEGAL")}`);
  lines.push(
    `- [${t("PRIVACY.TITLE")}](${env.siteOrigin}${localeUrl(locale, "/privacy")})`,
  );
  lines.push(
    `- [${t("TERMS.TITLE")}](${env.siteOrigin}${localeUrl(locale, "/terms")})`,
  );
  lines.push("");

  lines.push("## Optional");
  lines.push(`- [RSS](${env.siteOrigin}/${locale}/blog/feed.xml)`);
  lines.push(`- [Sitemap](${env.siteOrigin}/sitemap.xml)`);

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      // The homepage rewrites here on Accept: text/markdown; a shared cache keyed
      // on the URL alone would then serve markdown at /en to every visitor.
      "cache-control": request.headers.get("accept")?.includes("text/markdown")
        ? "private, no-store"
        : "public, max-age=3600, s-maxage=3600",
      vary: "Accept",
    },
  });
}
