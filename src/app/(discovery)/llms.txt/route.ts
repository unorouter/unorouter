import { localeUrl } from "@/i18n/navigation";
import { BLOG_REGISTRY, DOCS_REGISTRY } from "@/i18n/registry";
import { APP_VALUES, msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { rpc } from "@/lib/rpc";
import { handleElysia, modelSlug } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-static";
export const revalidate = 3600;

const siteOrigin = new URL(env.appUrl).origin;

export async function GET() {
  const locale = await serverLocale();
  const t = await getTranslations({ locale });
  const pricing = await rpc.api.pricing
    .get()
    .then(handleElysia)
    .catch(() => null);

  const lines: string[] = [];

  lines.push(`# ${env.appName}`);
  lines.push("");
  lines.push(`> ${t("HOME.META.DESCRIPTION", APP_VALUES)}`);
  lines.push("");

  lines.push(`## ${t(msg("NAV.DOCS"))}`);
  for (const doc of DOCS_REGISTRY) {
    const title = t(`${doc.i18nPrefix}.TITLE`, APP_VALUES);
    const note = t(`${doc.i18nPrefix}.SUBTITLE`, APP_VALUES);
    lines.push(
      `- [${title}](${siteOrigin}${localeUrl(locale, doc.path)}): ${note}`,
    );
  }
  lines.push("");

  lines.push(`## ${t(msg("NAV.BLOG"))}`);
  for (const post of BLOG_REGISTRY) {
    const title = t(`${post.i18nKey}.TITLE`, APP_VALUES);
    const note = t(`${post.i18nKey}.DESCRIPTION`, APP_VALUES);
    const url = `${siteOrigin}${localeUrl(locale, { pathname: "/blog/[slug]", params: { slug: post.slug } })}`;
    lines.push(`- [${title}](${url}): ${note}`);
  }
  lines.push("");

  lines.push(`## ${t(msg("FOOTER.PRODUCT"))}`);
  lines.push(
    `- [${t(msg("NAV.PRICING"))}](${siteOrigin}${localeUrl(locale, "/pricing")}): ${t(msg("PRICING.META.DESCRIPTION"), APP_VALUES)}`,
  );
  lines.push(
    `- [${t(msg("NAV.MODELS"))}](${siteOrigin}${localeUrl(locale, "/models")}): ${t(msg("MODELS.META.DESCRIPTION"), APP_VALUES)}`,
  );
  lines.push(
    `- [${t(msg("NAV.CHAT"))}](${siteOrigin}${localeUrl(locale, "/chat")}): ${t(msg("CHAT.META.DESCRIPTION"), APP_VALUES)}`,
  );
  lines.push("");

  const models = pricing?.models ?? [];
  if (models.length > 0) {
    lines.push(`## ${t(msg("FOOTER.MODELS"))}`);
    for (const model of models.slice(0, 50)) {
      const url = `${siteOrigin}${localeUrl(locale, { pathname: "/models/[slug]", params: { slug: modelSlug(model.name) } })}`;
      lines.push(`- [${model.name}](${url})`);
    }
    lines.push("");
  }

  lines.push(`## ${t(msg("FOOTER.LEGAL"))}`);
  lines.push(
    `- [${t(msg("PRIVACY.TITLE"))}](${siteOrigin}${localeUrl(locale, "/privacy")})`,
  );
  lines.push(
    `- [${t(msg("TERMS.TITLE"))}](${siteOrigin}${localeUrl(locale, "/terms")})`,
  );
  lines.push("");

  // "Optional" is reserved by the llms.txt spec (llmstxt.org): agents that
  // want a minimal context skip this section, so the heading must stay in
  // English. RSS and Sitemap are universal proper nouns.
  lines.push("## Optional");
  lines.push(`- [RSS](${siteOrigin}/${locale}/blog/feed.xml)`);
  lines.push(`- [Sitemap](${siteOrigin}/sitemap.xml)`);

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
