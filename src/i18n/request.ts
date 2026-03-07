import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../public/i18n/${locale}.json`)).default,
    defaultTranslationValues: {
      appName: process.env.NEXT_PUBLIC_APP_NAME,
      supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    },
  };
});
