"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { LoginLink } from "@/components/elements/brand/login-link";
import { NotifyBell } from "@/components/elements/notify/notify-bell";
import { Icon } from "@/components/ui/icon";
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
import { GuideIcon } from "@/components/pages/docs/guide-icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import { Link, usePathname } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import { APP_VALUES, type TranslationKey } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Fragment, useRef } from "react";
import { MobileNav } from "./mobile-nav";
import { isActiveLink, navigation, type NavigationItem } from "./navigation";

export function Navbar(props: { authSlot?: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const authQuery = useAuthQuery();
  const hydrated = useHydrated();
  const navRowRef = useRef<HTMLDivElement>(null);

  // Gate on hydrated: the first client render must match the prerendered
  // logged-out shell or React regenerates the whole tree.
  const navItems = navigation(hydrated && !!authQuery.data).filter(
    (item) => !item.hidden,
  );
  const docsItem = navItems.find((item) => item.name === "NAV.DOCS");
  const dropdownItems = navItems.filter(
    (item) => item.submenu && item.name !== "NAV.DOCS",
  );
  const topLevelItems = navItems.filter((item) => !item.submenu);

  const docsSubmenuGroups: {
    group: TranslationKey;
    items: NavigationItem[];
  }[] = [];
  for (const link of docsItem?.submenu ?? []) {
    const key = link.group ?? docsItem!.name;
    let bucket = docsSubmenuGroups.find((g) => g.group === key);
    if (!bucket) {
      bucket = { group: key, items: [] };
      docsSubmenuGroups.push(bucket);
    }
    bucket.items.push(link);
  }

  return (
    <nav className="navbar-scroll fixed top-0 right-0 left-0 z-50 border-b border-transparent bg-transparent">
      <div
        ref={navRowRef}
        className="mx-auto flex h-14 max-w-360 items-center justify-between px-3 font-mono sm:px-6"
      >
        <div className="flex items-center gap-2 lg:hidden">
          <MobileNav />
          <Link href="/" className="group flex items-center gap-2">
            <LogoImage alt="" />
            <CompanyName className="text-foreground group-hover:text-muted-foreground text-lg transition-colors" />
          </Link>
        </div>

        <Link href="/" className="group hidden items-center gap-2 lg:flex">
          <LogoImage alt="" />
          <CompanyName className="text-foreground group-hover:text-muted-foreground text-lg transition-colors" />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
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
              onClick={() =>
                analytics.navigation.topLinkClicked({
                  name: link.name,
                  from_route: pathname,
                })
              }
            >
              {t(link.name)}
            </Link>
          ))}

          {dropdownItems.map((item) => (
            <NavigationMenu key={item.name} className="flex-none">
              <NavigationMenuList>
                <NavigationMenuItem className="flex items-center">
                  <NavigationMenuTrigger
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground h-auto min-h-0 bg-transparent p-0 text-[11px] font-medium tracking-widest uppercase hover:bg-transparent focus:bg-transparent data-open:bg-transparent data-open:hover:bg-transparent data-open:focus:bg-transparent data-popup-open:bg-transparent"
                    render={<Link href={item.href}>{t(item.name)}</Link>}
                  />
                  <NavigationMenuContent>
                    <ul className="grid w-max min-w-40 gap-0.5 p-1">
                      {(item.submenu ?? []).map((sub) => (
                        <li key={sub.name}>
                          <NavigationMenuLink
                            render={
                              <Link
                                href={sub.href}
                                className="hover:bg-muted/50 focus:bg-muted/50 grid grid-cols-[auto_1fr] items-center gap-x-2.5 rounded-md px-2.5 py-1.5 transition-colors"
                                onClick={() =>
                                  analytics.navigation.topLinkClicked({
                                    name: sub.name,
                                    from_route: pathname,
                                  })
                                }
                              >
                                {sub.iconName ? (
                                  <Icon
                                    name={sub.iconName}
                                    className="text-muted-foreground size-4"
                                  />
                                ) : null}
                                <span className="text-foreground text-[13px] font-medium">
                                  {t(sub.name)}
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
          ))}

          {docsItem && (
            <NavigationMenu
              className="flex-none"
              anchor={navRowRef}
              align="center"
              collisionAvoidance={{ side: "none", align: "shift" }}
            >
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
                    <div className="grid max-h-[calc(100dvh-5.5rem)] w-[min(92vw,1080px)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain p-1 md:grid-cols-3 lg:grid-cols-4">
                      {docsSubmenuGroups.map((grp) => (
                        <Fragment key={grp.group}>
                          <span
                            className="text-muted-foreground/60 col-span-full px-1 pt-2 pb-1 font-mono text-[10px] tracking-[0.15em] uppercase first:pt-0"
                            aria-hidden="true"
                          >
                            {t(grp.group)}
                          </span>
                          {grp.items.map((link) => (
                            <NavigationMenuLink
                              key={link.name}
                              render={
                                <Link
                                  href={link.href}
                                  className="border-border/60 bg-card/40 hover:border-primary/40 hover:bg-muted/50 grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-0.5 rounded-md border px-3 py-2 transition-colors"
                                  onClick={() =>
                                    analytics.navigation.docsSubmenuLinkClicked(
                                      {
                                        name: link.name,
                                      },
                                    )
                                  }
                                >
                                  <span className="row-span-2 flex size-5 shrink-0 items-center justify-center self-center">
                                    {link.guideIcon ? (
                                      <GuideIcon
                                        iconKey={link.guideIcon.iconKey}
                                        logoSrc={link.guideIcon.logoSrc}
                                        logoBg={link.guideIcon.logoBg}
                                        logoMono={link.guideIcon.logoMono}
                                        size={18}
                                      />
                                    ) : link.iconName ? (
                                      <Icon
                                        name={link.iconName}
                                        className="size-4"
                                      />
                                    ) : link.iconComponent ? (
                                      <link.iconComponent className="size-4" />
                                    ) : null}
                                  </span>
                                  <span className="text-foreground truncate text-[13px] font-semibold">
                                    {t(link.name, APP_VALUES)}
                                  </span>
                                  {link.subtitle && (
                                    <span className="text-muted-foreground col-start-2 truncate text-[11px] leading-snug">
                                      {t(link.subtitle, APP_VALUES)}
                                    </span>
                                  )}
                                </Link>
                              }
                            />
                          ))}
                        </Fragment>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {env.discordUrl && (
            <a
              href={env.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("NAV.DISCORD")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="brand-discord" className="h-5 w-5" />
            </a>
          )}
          <NotifyBell />
          <LanguageToggle />
          <ThemeToggle />
          {props.authSlot ?? (
            <LoginLink
              aria-label={t("NAV.LOG_IN")}
              className="text-muted-foreground hover:text-foreground text-[11px] font-bold tracking-wider uppercase transition-colors"
            >
              <Icon name="log-in" className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline">{t("NAV.LOG_IN")}</span>
            </LoginLink>
          )}
        </div>
      </div>
    </nav>
  );
}
