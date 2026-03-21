"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand";
import { UserInfo } from "@/components/layout/user/user-info";
import { UserMenuItems } from "@/components/layout/user/user-menu-items";
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuMenu } from "react-icons/lu";
import { isActiveLink, navigation } from "./navigation";

export function MobileNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const authQuery = useAuthQuery();
  const userDisplay = useUserDisplay();

  function handleNavigate() {
    setOpen(false);
  }

  const navItems = navigation(!!authQuery.data).filter((item) => !item.hidden);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<button className="text-foreground md:hidden" />}>
        <LuMenu className="h-5 w-5" />
        <span className="sr-only">Menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-80 flex-col font-mono">
        <SheetHeader>
          <SheetTitle>
            <Link
              href="/"
              onClick={handleNavigate}
              className="flex items-center gap-2"
            >
              <LogoImage />
              <CompanyName className="text-lg" />
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          <nav className="space-y-4">
            {navItems.map((item) => {
              if (item.submenu) {
                return (
                  <div key={item.name} className="space-y-2">
                    <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
                      {t(item.name)}
                    </p>
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        onClick={handleNavigate}
                        className={cn(
                          "text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm tracking-wider uppercase",
                          isActiveLink(pathname, subItem.href) &&
                            "text-foreground",
                        )}
                      >
                        {subItem.icon && <subItem.icon className="h-3 w-3" />}
                        {t(subItem.name)}
                      </Link>
                    ))}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    "text-muted-foreground hover:text-foreground block text-sm tracking-wider uppercase",
                    isActiveLink(pathname, item.href) && "text-foreground",
                  )}
                >
                  {t(item.name)}
                </Link>
              );
            })}
          </nav>

          <div className="border-border flex flex-col gap-3 border-t pt-4">
            {userDisplay.user ? (
              <>
                <UserInfo badgePosition="inline" />
                <UserMenuItems onAction={handleNavigate} />
              </>
            ) : authQuery.isLoading ? null : (
              <Link
                href="/login"
                onClick={handleNavigate}
                className="text-muted-foreground hover:text-foreground text-sm tracking-wider uppercase"
              >
                {t("NAV.LOG_IN")}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 border-t pt-4">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
