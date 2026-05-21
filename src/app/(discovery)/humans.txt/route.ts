import { LANGUAGES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { serverLocale } from "@/lib/utils/server";
import { dayjs } from "@/lib/utils/format/date";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const locale = await serverLocale();
  const t = await getTranslations({ locale });

  const languageList = LANGUAGES.map((lang) => t(`LANGUAGE.${lang.code}`)).join(
    ", ",
  );

  const lines = [
    `/* ${t("WELL_KNOWN.HUMANS.TEAM_SECTION")} */`,
    `${t("WELL_KNOWN.HUMANS.NAME_LABEL")}: ${env.appName}`,
    `${t("WELL_KNOWN.HUMANS.CONTACT_LABEL")}: ${env.supportEmail}`,
    env.twitterUrl && `Twitter: ${env.twitterUrl}`,
    env.githubUrl && `GitHub: ${env.githubUrl}`,
    env.discordUrl && `Discord: ${env.discordUrl}`,
    "",
    `/* ${t("WELL_KNOWN.HUMANS.SITE_SECTION")} */`,
    `${t("WELL_KNOWN.HUMANS.LAST_UPDATE_LABEL")}: ${dayjs().format("YYYY-MM-DD")}`,
    `${t("WELL_KNOWN.HUMANS.LANGUAGE_LABEL")}: ${languageList}`,
    `${t("WELL_KNOWN.HUMANS.COMPONENTS_LABEL")}: Next.js, React, Tailwind CSS, shadcn/ui, Elysia, Drizzle ORM`,
    `${t("WELL_KNOWN.HUMANS.STANDARDS_LABEL")}: HTML5, CSS3, JSON-LD`,
    "",
  ].filter(Boolean);

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
      Vary: "Cookie",
    },
  });
}
