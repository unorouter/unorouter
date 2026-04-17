import { localeUrl } from "@/i18n/navigation";
import { BLOG_REGISTRY, DOCS_REGISTRY } from "@/i18n/registry";
import { routing } from "@/i18n/routing";
import { APP_VALUES, msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-static";
export const revalidate = 3600;

const locale = routing.defaultLocale;
const siteOrigin = new URL(env.appUrl).origin;

function abs(path: string) {
  return `${siteOrigin}${path}`;
}

function line(name: string, url: string, note?: string) {
  return note ? `- [${name}](${url}): ${note}` : `- [${name}](${url})`;
}

export async function GET() {
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

  lines.push("## Docs");
  for (const doc of DOCS_REGISTRY) {
    lines.push(
      line(
        t(`${doc.i18nPrefix}.TITLE`, APP_VALUES),
        abs(localeUrl(locale, doc.path)),
        t(`${doc.i18nPrefix}.SUBTITLE`, APP_VALUES),
      ),
    );
  }
  lines.push("");

  lines.push("## Blog");
  for (const post of BLOG_REGISTRY) {
    lines.push(
      line(
        t(`${post.i18nKey}.TITLE`, APP_VALUES),
        abs(
          localeUrl(locale, {
            pathname: "/blog/[slug]",
            params: { slug: post.slug },
          }),
        ),
        t(`${post.i18nKey}.DESCRIPTION`, APP_VALUES),
      ),
    );
  }
  lines.push("");

  lines.push("## Product");
  lines.push(
    line(
      t(msg("NAV.PRICING")),
      abs(localeUrl(locale, "/pricing")),
      t(msg("PRICING.META.DESCRIPTION"), APP_VALUES),
    ),
  );
  lines.push(
    line(
      t(msg("NAV.MODELS")),
      abs(localeUrl(locale, "/models")),
      t(msg("MODELS.META.DESCRIPTION"), APP_VALUES),
    ),
  );
  lines.push(
    line(
      t(msg("NAV.CHAT")),
      abs(localeUrl(locale, "/chat")),
      t(msg("CHAT.META.DESCRIPTION"), APP_VALUES),
    ),
  );
  lines.push("");

  const models = pricing?.models ?? [];
  if (models.length > 0) {
    lines.push("## Models");
    for (const model of models.slice(0, 50)) {
      lines.push(
        line(
          model.name,
          abs(
            localeUrl(locale, {
              pathname: "/models/[slug]",
              params: { slug: model.name },
            }),
          ),
        ),
      );
    }
    lines.push("");
  }

  lines.push("## Legal");
  lines.push(
    line(t(msg("PRIVACY.TITLE")), abs(localeUrl(locale, "/privacy"))),
  );
  lines.push(line(t(msg("TERMS.TITLE")), abs(localeUrl(locale, "/terms"))));
  lines.push("");

  lines.push("## Optional");
  lines.push(line("RSS", abs(`/${locale}/blog/feed.xml`)));
  lines.push(line("Sitemap", abs("/sitemap.xml")));

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
