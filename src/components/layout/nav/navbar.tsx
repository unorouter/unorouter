"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { LoginLink } from "@/components/elements/auth/login-link";
import { UserAvatar } from "@/components/layout/user/user-avatar";
import { UserDropdown } from "@/components/layout/user/user-dropdown";
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useAuthQuery } from "@/hooks/auth-hook";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { MobileNav } from "./mobile-nav";
import { isActiveLink, navigation } from "./navigation";

export function Navbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const authQuery = useAuthQuery();

  const navItems = navigation(!!authQuery.data).filter((item) => !item.hidden);
  const topLevelItems = navItems.filter((item) => !item.submenu);
  const docsItem = navItems.find((item) => item.submenu);

  return (
    <nav className="navbar-scroll fixed top-0 right-0 left-0 z-50 border-b border-transparent bg-transparent">
      <div className="mx-auto flex h-14 max-w-360 items-center justify-between px-6 font-mono">
        {/* Mobile: Hamburger + Logo */}
        <div className="flex items-center gap-2 md:hidden">
          <MobileNav />
          <Link href="/" className="group flex items-center gap-2">
            <LogoImage />
            <CompanyName className="text-foreground group-hover:text-muted-foreground text-lg transition-colors" />
          </Link>
        </div>

        {/* Desktop: Logo */}
        <Link href="/" className="group hidden items-center gap-2 md:flex">
          <LogoImage />
          <CompanyName className="text-foreground group-hover:text-muted-foreground text-lg transition-colors" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {topLevelItems.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "text-[11px] font-medium tracking-widest uppercase transition-colors",
                isActiveLink(pathname, link.href, link.exact)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(link.name)}
            </Link>
          ))}

          {docsItem && (
            <NavigationMenu className="flex-none">
              <NavigationMenuList>
                <NavigationMenuItem className="flex items-center">
                  <NavigationMenuTrigger
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground h-auto min-h-0 bg-transparent p-0 text-[11px] font-medium tracking-widest uppercase hover:bg-transparent focus:bg-transparent data-open:bg-transparent data-open:hover:bg-transparent data-open:focus:bg-transparent data-popup-open:bg-transparent"
                    render={
                      <Link href={docsItem.href}>{t(docsItem.name)}</Link>
                    }
                  />
                  <NavigationMenuContent>
                    <ul className="grid gap-1">
                      {docsItem.submenu!.map((link, idx) => {
                        const prevGroup =
                          idx > 0
                            ? docsItem.submenu![idx - 1].group
                            : undefined;
                        const showHeading =
                          link.group && link.group !== prevGroup;
                        return (
                          <Fragment key={link.name}>
                            {showHeading && (
                              <li
                                className={cn(
                                  "text-muted-foreground/70 px-1 pt-2 pb-1 text-[9px] font-semibold tracking-widest uppercase",
                                  idx === 0 && "pt-0",
                                )}
                                aria-hidden="true"
                              >
                                {t(link.group!)}
                              </li>
                            )}
                            <li>
                              <NavigationMenuLink
                                render={
                                  <Link
                                    href={link.href}
                                    className="flex items-center gap-2"
                                  >
                                    {link.icon && (
                                      <link.icon className="h-3 w-3" />
                                    )}
                                    <span className="text-[11px] font-medium tracking-wider whitespace-nowrap uppercase">
                                      {t(link.name)}
                                    </span>
                                  </Link>
                                }
                              />
                            </li>
                          </Fragment>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-4 md:flex">
          <LanguageToggle />
          <ThemeToggle />
          {authQuery.data ? (
            <UserDropdown side="bottom" align="end">
              <button className="cursor-pointer focus:outline-none">
                <UserAvatar />
              </button>
            </UserDropdown>
          ) : authQuery.isLoading ? null : (
            <LoginLink className="text-muted-foreground hover:text-foreground text-[11px] font-bold tracking-wider uppercase transition-colors">
              {t("NAV.LOG_IN")}
            </LoginLink>
          )}
        </div>

        {/* Mobile: Lang/Theme + User avatar */}
        <div className="flex items-center gap-4 md:hidden">
          <LanguageToggle />
          <ThemeToggle />
          {authQuery.data ? (
            <UserDropdown side="bottom" align="end">
              <button className="cursor-pointer focus:outline-none">
                <UserAvatar />
              </button>
            </UserDropdown>
          ) : authQuery.isLoading ? null : (
            <LoginLink className="text-muted-foreground hover:text-foreground text-[11px] font-bold tracking-wider uppercase transition-colors">
              {t("NAV.LOG_IN")}
            </LoginLink>
          )}
        </div>
      </div>
    </nav>
  );
}
