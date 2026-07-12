import { routing } from "@/i18n/routing";
import { env } from "@/lib/config/env";
import { dayjs } from "@/lib/utils/format/date";

export function GET() {
  const expires = dayjs().add(1, "year").toISOString();

  const body = [
    `Contact: mailto:${env.supportEmail}`,
    `Expires: ${expires}`,
    `Preferred-Languages: ${routing.locales.join(", ")}`,
    `Canonical: ${env.siteOrigin}/.well-known/security.txt`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
