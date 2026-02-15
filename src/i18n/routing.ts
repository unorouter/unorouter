import { defineRouting } from "next-intl/routing";
import { LOCALES } from "@/lib/config/constants";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: LOCALES[0],
  localePrefix: "always",
  localeDetection: true,
});
