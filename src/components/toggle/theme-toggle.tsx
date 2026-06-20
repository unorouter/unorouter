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
import { ThemeCustomizerSheet } from "@/components/ui/theme/customizer-sheet";
import { analytics } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";

export function ThemeToggle() {
  const t = useTranslations();
  const { setTheme } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const styleId = "theme-transition-styles";

  const updateStyles = (css: string) => {
    if (typeof window === "undefined") return;

    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;
  };

  const handleThemeChange = (theme: string) => {
    analytics.settings.themeChanged(theme);
    const anim = getRandomAnimation();
    const animation = createAnimation(anim.variant, anim.start);
    updateStyles(animation.css);

    if (typeof window === "undefined") return;

    const switchTheme = () => {
      setTheme(theme);
    };

    if (!document.startViewTransition) {
      switchTheme();
      return;
    }

    document.startViewTransition(switchTheme);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" />
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
          <DropdownMenuItem
            onClick={() => handleThemeChange("light")}
            className="cursor-pointer"
          >
            <Icon name="sun" className="h-4 w-4" />
            {t("THEME.LIGHT")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleThemeChange("dark")}
            className="cursor-pointer"
          >
            <Icon name="moon" className="h-4 w-4" />
            {t("THEME.DARK")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleThemeChange("system")}
            className="cursor-pointer"
          >
            <Icon name="monitor" className="h-4 w-4" />
            {t("THEME.SYSTEM")}
          </DropdownMenuItem>
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
