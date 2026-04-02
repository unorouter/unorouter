"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createAnimation,
  getRandomAnimation,
} from "@/components/ui/theme-animations";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { LuMonitor, LuMoon, LuSun } from "react-icons/lu";

export function ThemeToggle() {
  const t = useTranslations();
  const { setTheme } = useTheme();
  const styleId = "theme-transition-styles";

  const updateStyles = useCallback((css: string) => {
    if (typeof window === "undefined") return;

    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;
  }, []);

  const handleThemeChange = useCallback(
    (theme: string) => {
      const { variant: randomVariant, start: randomStart } =
        getRandomAnimation();
      const animation = createAnimation(randomVariant, randomStart);
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
    },
    [setTheme, updateStyles],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" />
        }
      >
        <LuSun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <LuMoon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleThemeChange("light")}
          className="cursor-pointer"
        >
          <LuSun className="h-4 w-4" />
          {t("THEME.LIGHT")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("dark")}
          className="cursor-pointer"
        >
          <LuMoon className="h-4 w-4" />
          {t("THEME.DARK")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("system")}
          className="cursor-pointer"
        >
          <LuMonitor className="h-4 w-4" />
          {t("THEME.SYSTEM")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
