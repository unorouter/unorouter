import { localeUrl } from "@/i18n/navigation";
import { DOCS_REGISTRY } from "@/i18n/registry";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";


function skillName(slug: string) {
  return `configure-${slug.replace(/^docs\//, "").replace(/[^a-z0-9-]/gi, "-")}`;
}

export async function GET() {
  const locale = await serverLocale();
  const t = await getTranslations({ locale });

  const docSkills = DOCS_REGISTRY.filter((d) => d.slug !== "docs").map(
    (doc) => ({
      name: skillName(doc.slug),
      description: `${t(`${doc.i18nPrefix}.TITLE`, APP_VALUES)}: ${t(`${doc.i18nPrefix}.SUBTITLE`, APP_VALUES)}`,
      homepage: `${env.siteOrigin}${localeUrl(locale, doc.path)}`,
    }),
  );

  const body = {
    version: "0.2.0",
    skills: [
      {
        name: "route-chat-completion",
        description: t("WELL_KNOWN.AGENT_SKILLS.ROUTE_CHAT"),
        homepage: `${env.siteOrigin}${localeUrl(locale, "/docs")}`,
      },
      {
        name: "browse-model-catalog",
        description: t("WELL_KNOWN.AGENT_SKILLS.BROWSE_CATALOG"),
        homepage: `${env.siteOrigin}${localeUrl(locale, "/models")}`,
      },
      ...docSkills,
    ],
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      Vary: "Cookie",
    },
  });
}
