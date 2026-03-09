"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand";
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthQuery, useLogoutMutation } from "@/hooks/auth-hook";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuLayoutDashboard, LuLogOut, LuMenu, LuWallet } from "react-icons/lu";
import { isActiveLink, navigation, ROLE_LABELS } from "./navigation";

export function MobileNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const { data: user, isLoading: isLoadingAuth } = useAuthQuery();
  const isAuthenticated = !!user;
  const logoutMutation = useLogoutMutation();

  const displayName = user?.display_name || user?.username || "";
  const initials = displayName.charAt(0).toUpperCase();
  const roleKey = user ? ROLE_LABELS[user.role] : undefined;
  const balanceDisplay = user?.quota !== undefined ? `$${(user.quota / 500000).toFixed(2)}` : null;

  async function handleLogout() {
    setOpen(false);
    try {
      await logoutMutation.mutateAsync();
      window.location.reload();
    } catch {
      // error handled by mutation
    }
  }

  function handleNavigate() {
    setOpen(false);
  }

  const navItems = navigation().filter((item) => !item.hidden);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button className="text-foreground md:hidden" />
        }
      >
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
                      {t(item.name as any)}
                    </p>
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href as any}
                        onClick={handleNavigate}
                        className={cn(
                          "text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm tracking-wider uppercase",
                          isActiveLink(pathname, subItem.href) &&
                            "text-foreground",
                        )}
                      >
                        {subItem.icon && <subItem.icon className="h-3 w-3" />}
                        {t(subItem.name as any)}
                      </Link>
                    ))}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href as any}
                  onClick={handleNavigate}
                  className={cn(
                    "text-muted-foreground hover:text-foreground block text-sm tracking-wider uppercase",
                    isActiveLink(pathname, item.href) && "text-foreground",
                  )}
                >
                  {t(item.name as any)}
                </Link>
              );
            })}
          </nav>

          <div className="border-border flex flex-col gap-3 border-t pt-4">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                    <span className="text-foreground text-xs font-bold">
                      {initials}
                    </span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="text-foreground truncate font-medium">
                      {displayName}
                    </span>
                    {user.group && (
                      <span className="text-muted-foreground truncate text-xs">
                        {user.group}
                      </span>
                    )}
                  </div>
                  {roleKey && (
                    <Badge variant="secondary" className="text-xs">
                      {t(roleKey as any)}
                    </Badge>
                  )}
                </div>
                {balanceDisplay && (
                  <div className="flex items-center gap-2 text-sm">
                    <LuWallet className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">{t("AUTH.BALANCE" as any)}</span>
                    <span className="ml-auto font-mono text-xs font-medium tabular-nums">{balanceDisplay}</span>
                  </div>
                )}
                <a
                  href={process.env.NEXT_PUBLIC_API_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleNavigate}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm tracking-wider uppercase"
                >
                  <LuLayoutDashboard className="h-3.5 w-3.5" />
                  {t("AUTH.DASHBOARD")}
                </a>
                <button
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm tracking-wider uppercase"
                >
                  <LuLogOut className="h-3.5 w-3.5" />
                  {t("AUTH.LOG_OUT")}
                </button>
              </>
            ) : isLoadingAuth ? null : (
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
