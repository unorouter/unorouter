import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "./routing";

// The unknown-locale guard lives HERE rather than in the [locale] layout,
// where a notFound() thrown from a ROOT layout does not render the right 404.
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
