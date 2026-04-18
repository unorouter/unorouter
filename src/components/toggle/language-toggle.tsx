"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES } from "@/lib/config/constants";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export function LanguageToggle() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const currentLanguage = LANGUAGES.find((lang) => lang.locale === locale);

  const handleLanguageChange = (newLocale: string) => {
    // Use the raw pathname (which stays in sync with shallow history updates)
    // and swap the locale prefix. next-intl middleware handles path localization.
    const newPath = pathname.replace(
      new RegExp(`^/${locale}(?=/|$)`),
      `/${newLocale}`,
    );
    startTransition(() => {
      router.replace(newPath);
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
      <DropdownMenuContent align="end">
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
