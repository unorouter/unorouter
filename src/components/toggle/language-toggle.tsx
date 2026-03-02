"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LANGUAGES } from "@/lib/config/constants";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function LanguageToggle() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const params = useParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLanguage = LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === locale.toLowerCase(),
  );

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- TypeScript will validate that only known `params`
        // are used in combination with a given `pathname`. Since the two will
        // always match for the current route, we can skip runtime checks.
        { pathname, params },
        { locale: newLocale },
      );
    });
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label="Switch language">
        {currentLanguage && (
          <currentLanguage.Flag className="h-3.5 w-5 rounded-sm" />
        )}
      </Button>
    );
  }

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
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code.toLowerCase())}
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
