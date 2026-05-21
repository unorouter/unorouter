import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";


export async function GET() {
  const locale = await serverLocale();
  const t = await getTranslations({ locale });

  const body = {
    linkset: [
      {
        anchor: env.siteOrigin,
        "service-desc": [
          {
            href: `${env.siteOrigin}/api/openapi/json`,
            type: "application/vnd.oai.openapi+json;version=3.1",
            title: t("WELL_KNOWN.API_CATALOG.OPENAPI_TITLE", APP_VALUES),
          },
          {
            href: `${env.apiOrigin}/v1`,
            type: "text/html",
            title: t("WELL_KNOWN.API_CATALOG.RELAY_TITLE", APP_VALUES),
          },
        ],
        "service-doc": [
          {
            href: `${env.siteOrigin}/${locale}/docs`,
            type: "text/html",
            title: t("WELL_KNOWN.API_CATALOG.DOCS_TITLE", APP_VALUES),
          },
        ],
        "service-meta": [
          {
            href: `${env.siteOrigin}/.well-known/agent-card.json`,
            type: "application/json",
            title: t("WELL_KNOWN.API_CATALOG.AGENT_CARD_TITLE"),
          },
        ],
        "service-auth": [
          {
            href: `${env.apiOrigin}/.well-known/oauth-authorization-server`,
            type: "application/json",
            title: t("WELL_KNOWN.API_CATALOG.AUTH_SERVER_TITLE"),
          },
          {
            href: `${env.siteOrigin}/.well-known/oauth-protected-resource`,
            type: "application/json",
            title: t("WELL_KNOWN.API_CATALOG.PROTECTED_RESOURCE_TITLE"),
          },
        ],
      },
    ],
  };
  return Response.json(body, {
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=3600",
      Vary: "Cookie",
    },
  });
}
