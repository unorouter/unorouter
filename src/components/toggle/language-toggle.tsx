"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { matchPathname, useRouter } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import { LANGUAGES } from "@/lib/config/constants";
import type { Locale } from "next-intl";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

export function LanguageToggle() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const currentLanguage = LANGUAGES.find((lang) => lang.locale === locale);

  const handleLanguageChange = (newLocale: Locale) => {
    analytics.settings.localeChanged(newLocale);
        // Resolve the localized URL back to its typed { pathname, params } shape so next-intl's router can re-localize against the pathnames map.
    const matched = matchPathname(pathname, locale);
    startTransition(() => {
      if (matched) {
        router.replace(matched, { locale: newLocale });
      } else {
        router.replace("/", { locale: newLocale });
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={isPending ? "opacity-30 transition-opacity" : ""}
            aria-label="Switch language"
          />
        }
      >
        {currentLanguage && (
          <currentLanguage.Flag className="h-3.5 w-5 rounded-sm" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="grid grid-cols-2 gap-x-1">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.locale}
            onClick={() => handleLanguageChange(lang.locale)}
            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm"
          >
            <lang.Flag className="h-3.5 w-5 rounded-sm" />
            {t(`LANGUAGE.${lang.code}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
