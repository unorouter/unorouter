"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand";
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
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
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
                isActiveLink(pathname, link.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(link.name)}
            </Link>
          ))}

          {docsItem && (
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground h-auto bg-transparent px-0 py-0 text-[11px] font-medium tracking-widest uppercase hover:bg-transparent focus:bg-transparent data-open:bg-transparent data-open:hover:bg-transparent data-open:focus:bg-transparent data-popup-open:bg-transparent"
                    render={
                      <Link href={docsItem.href}>{t(docsItem.name)}</Link>
                    }
                  />
                  <NavigationMenuContent>
                    <ul className="grid gap-1">
                      {docsItem.submenu!.map((link) => (
                        <li key={link.name}>
                          <NavigationMenuLink
                            render={
                              <Link
                                href={link.href}
                                className="flex items-center gap-2"
                              >
                                {link.icon && <link.icon className="h-3 w-3" />}
                                <span className="text-[11px] font-medium tracking-wider whitespace-nowrap uppercase">
                                  {t(link.name)}
                                </span>
                              </Link>
                            }
                          />
                        </li>
                      ))}
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
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground text-[11px] font-bold tracking-wider uppercase transition-colors"
            >
              {t("NAV.LOG_IN")}
            </Link>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
