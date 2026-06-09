import { SETUP_GUIDES } from "@/components/pages/docs/setup-guides";
import { localeUrl } from "@/i18n/navigation";
import { BLOG_REGISTRY, DOCS_REGISTRY } from "@/i18n/registry";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { rpc } from "@/lib/rpc";
import { handleElysia, modelSlug } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const locale = await serverLocale();
  const t = await getTranslations({ locale });
  const pricing = await rpc.api.models.pricing
    .get()
    .then(handleElysia)
    .catch(() => null);

  const lines: string[] = [];

  lines.push(`# ${env.appName}`);
  lines.push("");
  lines.push(`> ${t("HOME.META.DESCRIPTION", APP_VALUES)}`);
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
    for (const model of models.slice(0, 50)) {
      const url = `${env.siteOrigin}${localeUrl(locale, { pathname: "/models/[slug]", params: { slug: modelSlug(model.name) } })}`;
      lines.push(`- [${model.name}](${url})`);
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

  // "Optional" reserved by llmstxt.org; heading stays English. RSS/Sitemap universal.
  lines.push("## Optional");
  lines.push(`- [RSS](${env.siteOrigin}/${locale}/blog/feed.xml)`);
  lines.push(`- [Sitemap](${env.siteOrigin}/sitemap.xml)`);

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
