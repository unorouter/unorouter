import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const raw = await import(`../../public/i18n/${locale}.json`);

  return {
    locale,
    messages: raw.default,
    // Explicit zone: without it next-intl warns ENVIRONMENT_FALLBACK and
    // server/client date formatting can diverge (hydration mismatch).
    timeZone: "UTC",
  };
});
