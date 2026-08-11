import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "./routing";

// The unknown-locale guard lives HERE rather than in the [locale] layout: a
// notFound() thrown from a ROOT layout cannot be validated against `instant`,
// so every genuine 404 also logged a confusing "Could not validate `instant`".
// (setRequestLocale is deprecated in favour of next/root-params, but that needs
// experimental.rootParams enabled to emit its exports; migrate together.)
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
