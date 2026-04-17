import { env } from "@/lib/config/env";
import dayjs from "dayjs";

export const dynamic = "force-static";

export function GET() {
  const lines = [
    "/* TEAM */",
    `Name: ${env.appName}`,
    `Contact: ${env.supportEmail}`,
    env.twitterUrl && `Twitter: ${env.twitterUrl}`,
    env.githubUrl && `GitHub: ${env.githubUrl}`,
    env.discordUrl && `Discord: ${env.discordUrl}`,
    "",
    "/* SITE */",
    `Last update: ${dayjs().format("YYYY-MM-DD")}`,
    "Language: English, Deutsch",
    "Components: Next.js, React, Tailwind CSS, shadcn/ui, Elysia, Drizzle ORM",
    "Standards: HTML5, CSS3, JSON-LD",
    "",
  ].filter(Boolean);

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
