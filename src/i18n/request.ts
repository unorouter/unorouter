import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "./routing";

// Guard belongs here: notFound() thrown from the ROOT layout renders the wrong 404.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  if (!hasLocale(routing.locales, requested)) notFound();
  const locale = requested;

  const raw = await import(`../../public/i18n/${locale}.json`);

  return {
    locale,
    messages: raw.default,
    timeZone: "UTC",
  };
});
