import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const REPLACEMENTS: Record<string, string> = {
  __appName__: process.env.NEXT_PUBLIC_APP_NAME,
  __supportEmail__: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
};

const PATTERN = new RegExp(Object.keys(REPLACEMENTS).join("|"), "g");

function interpolate(json: string) {
  return JSON.parse(json.replace(PATTERN, (m) => REPLACEMENTS[m]));
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const raw = await import(`../../public/i18n/${locale}.json`);

  return {
    locale,
    messages: interpolate(JSON.stringify(raw.default)),
  };
});
