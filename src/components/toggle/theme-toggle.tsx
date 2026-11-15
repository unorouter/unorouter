"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createAnimation,
  getRandomAnimation,
} from "@/components/ui/theme-animations";
import { ThemeCustomizerSheet } from "@/components/elements/theme/customizer-sheet";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";

const THEME_OPTIONS = [
  { theme: "light", icon: "sun", label: "THEME.LIGHT" },
  { theme: "dark", icon: "moon", label: "THEME.DARK" },
  { theme: "system", icon: "monitor", label: "THEME.SYSTEM" },
] as const;

export function ThemeToggle() {
  const t = useTranslations();
  const setTheme = useTheme().setTheme;
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleThemeChange = (theme: string) => {
    const anim = getRandomAnimation();
    let style = document.getElementById("theme-transition-styles");
    if (!style) {
      style = document.createElement("style");
      style.id = "theme-transition-styles";
      document.head.appendChild(style);
    }
    style.textContent = createAnimation(anim.variant, anim.start).css;
    if (document.startViewTransition)
      document.startViewTransition(() => setTheme(theme));
    else setTheme(theme);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("COMMON.TOGGLE_THEME")}
            />
          }
        >
          <Icon
            name="sun"
            className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
          />
          <Icon
            name="moon"
            className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {THEME_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.theme}
              onClick={() => handleThemeChange(option.theme)}
              className="cursor-pointer"
            >
              <Icon name={option.icon} className="h-4 w-4" />
              {t(option.label)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setSheetOpen(true)}
            className="cursor-pointer"
          >
            <Icon name="paintbrush" className="h-4 w-4" />
            {t("THEME.CUSTOMIZE")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ThemeCustomizerSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
