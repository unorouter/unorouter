"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { Icon } from "@/components/ui/icon";
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { expandedNavAtom, toggleNavigationAtom } from "@/store/client-store";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { Fragment, useState } from "react";
import { isActiveLink, NavigationItem, navigation } from "./navigation";

export function MobileNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const authQuery = useAuthQuery();

  function handleNavigate() {
    setOpen(false);
  }

  const hydrated = useHydrated();
  const navItems = navigation(hydrated && !!authQuery.data).filter(
    (item) => !item.hidden,
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<button className="text-foreground md:hidden" />}>
        <Icon name="menu" className="h-5 w-5" />
        <span className="sr-only">{t("NAV.MENU")}</span>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-80 flex-col font-mono">
        <SheetHeader>
          <SheetTitle>
            <Link
              href="/"
              onClick={handleNavigate}
              className="flex items-center gap-2"
            >
              <LogoImage alt="" />
              <CompanyName className="text-lg" />
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              if (item.submenu) {
                return (
                  <CollapsibleNavItem
                    key={item.name}
                    item={item}
                    onNavigate={handleNavigate}
                  />
                );
              }

              const isActive = isActiveLink(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleNavigate}
                  className={cn(
                    "hover:bg-foreground/5 flex items-center gap-2 rounded-md px-3 py-2 text-sm tracking-wider uppercase transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.iconName && (
                    <Icon name={item.iconName} className="h-4 w-4" />
                  )}
                  {item.iconComponent && (
                    <item.iconComponent className="h-4 w-4" />
                  )}
                  {t(item.name)}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex items-center gap-2 border-t pt-4 pb-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CollapsibleNavItem(props: {
  item: NavigationItem;
  onNavigate: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const expanded = useAtomValue(expandedNavAtom);
  const toggleNavigation = useSetAtom(toggleNavigationAtom);

  const isActive = isActiveLink(pathname, props.item.href, props.item.exact);
  const isExpanded = expanded[props.item.name] ?? false;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={props.item.href}
          onClick={props.onNavigate}
          className={cn(
            "hover:bg-foreground/5 flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm tracking-wider uppercase transition-colors",
            isActive
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {props.item.iconName && (
            <Icon name={props.item.iconName} className="h-4 w-4" />
          )}
          {props.item.iconComponent && (
            <props.item.iconComponent className="h-4 w-4" />
          )}
          {t(props.item.name)}
        </Link>
        <button
          type="button"
          onClick={() => toggleNavigation(props.item.name)}
          className="hover:bg-foreground/5 flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <Icon
            name="chevron-right"
            className={cn(
              "size-4 transition-transform duration-200",
              isExpanded && "rotate-90",
            )}
          />
        </button>
      </div>
      {isExpanded && (
        <ul className="mt-1 ml-4 flex flex-col gap-1 border-l pl-2">
          {props.item.submenu!.map((subItem, idx) => {
            const isSubActive = isActiveLink(
              pathname,
              subItem.href,
              subItem.exact,
            );
            const prevGroup =
              idx > 0 ? props.item.submenu![idx - 1].group : undefined;
            const showHeading = subItem.group && subItem.group !== prevGroup;
            return (
              <Fragment key={subItem.name}>
                {showHeading && (
                  <li
                    className={cn(
                      "text-muted-foreground/70 px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest uppercase",
                      idx === 0 && "pt-0",
                    )}
                    aria-hidden="true"
                  >
                    {t(subItem.group!)}
                  </li>
                )}
                <li>
                  <Link
                    href={subItem.href}
                    onClick={props.onNavigate}
                    className={cn(
                      "hover:bg-foreground/5 flex items-center gap-2 rounded-md px-3 py-2 text-sm tracking-wider uppercase transition-colors",
                      isSubActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {subItem.iconName && (
                      <Icon name={subItem.iconName} className="h-3 w-3" />
                    )}
                    {subItem.iconComponent && (
                      <subItem.iconComponent className="h-3 w-3" />
                    )}
                    {t(subItem.name)}
                  </Link>
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
