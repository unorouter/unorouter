"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand";
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useAuthQuery, useLogoutMutation } from "@/hooks/auth-hook";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { TranslationKey } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LuLayoutDashboard, LuLogOut } from "react-icons/lu";
import { MobileNav } from "./mobile-nav";
import { isActiveLink, navigation, ROLE_LABELS } from "./navigation";

export function Navbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  const { data: user, isLoading: isLoadingAuth } = useAuthQuery();
  const isAuthenticated = !!user;
  const logoutMutation = useLogoutMutation();

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      window.location.reload();
    } catch {
      // error handled by mutation
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const displayName = user?.display_name || user?.username || "";
  const initials = displayName.charAt(0).toUpperCase();
  const roleKey = user ? ROLE_LABELS[user.role] : undefined;

  const navItems = navigation();
  const topLevelItems = navItems.filter((item) => !item.submenu);
  const docsItem = navItems.find((item) => item.submenu);

  return (
    <nav
      className={cn(
        "fixed top-0 right-0 left-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "bg-background/90 border-border backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
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
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="bg-muted hover:bg-accent flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors focus:outline-none">
                <span className="text-foreground text-xs font-bold">
                  {initials}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="end"
                sideOffset={4}
                className="min-w-56 rounded-lg"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex flex-col gap-2 px-1 py-1.5 text-left text-sm">
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
                      </div>
                      {roleKey && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          <Badge variant="secondary" className="text-xs">
                            {t(roleKey as TranslationKey)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <LuLayoutDashboard />
                    {t("AUTH.DASHBOARD")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LuLogOut />
                  {t("AUTH.LOG_OUT")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isLoadingAuth ? null : (
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
