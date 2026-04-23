"use client";

import {
  docsNavItemsCli,
  docsNavItemsOverview,
  docsNavItemsRoleplay,
} from "@/components/layout/docs/docs-navigation";
import {
  type NavigationItem,
  isActiveLink,
  navigation,
  sidebarNavigation,
} from "@/components/layout/nav/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuthQuery } from "@/hooks/auth-hook";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useAui } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import type { SidebarNavConfig } from "./app-sidebar";

function NavGroup(props: { label: string; items: NavigationItem[] }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{props.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {props.items.map((item) => {
            const isActive = isActiveLink(pathname, item.href, item.exact);
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  render={<Link href={item.href} onClick={item.onClick} />}
                  tooltip={t(item.name)}
                  isActive={isActive}
                  className={cn(
                    isActive && "bg-primary/10 text-primary font-medium",
                  )}
                >
                  {item.icon && (
                    <item.icon
                      className={cn("size-4", isActive && "text-primary")}
                    />
                  )}
                  <span>{t(item.name)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

interface SidebarNavigationProps {
  navConfig?: SidebarNavConfig;
  chatContent?: React.ReactNode;
}

export function SidebarNavigation(props: SidebarNavigationProps) {
  const t = useTranslations();
  const { data: user } = useAuthQuery();
  const authenticated = !!user;

  if (props.navConfig === "chat") {
    return <ChatSidebarNav authenticated={authenticated} />;
  }

  if (props.navConfig === "docs") {
    const mainNavItems = navigation(authenticated).filter(
      (item) => !item.hidden && item.href !== "/docs",
    );
    return (
      <>
        <NavGroup
          label={t("DOCS_SIDEBAR.TITLE")}
          items={docsNavItemsOverview}
        />
        <NavGroup
          label={t("DOCS_SIDEBAR.GROUP_CLI")}
          items={docsNavItemsCli}
        />
        <NavGroup
          label={t("DOCS_SIDEBAR.GROUP_ROLEPLAY")}
          items={docsNavItemsRoleplay}
        />
        <NavGroup label={t("SIDEBAR.NAVIGATE")} items={mainNavItems} />
      </>
    );
  }

  const navItems = sidebarNavigation();
  const sidebarPaths = new Set(navItems.map((item) => item.href));
  const mainNavItems = navigation(authenticated).filter(
    (item) => !sidebarPaths.has(item.href),
  );

  return (
    <>
      <NavGroup label={t("SIDEBAR.MENU")} items={navItems} />
      <NavGroup label={t("SIDEBAR.NAVIGATE")} items={mainNavItems} />
    </>
  );
}

function ChatSidebarNav(props: { authenticated: boolean }) {
  const t = useTranslations();
  const aui = useAui();
  const items = navigation(props.authenticated)
    .filter((item) => !item.hidden)
    .map((item) =>
      item.href === "/chat"
        ? { ...item, onClick: () => aui.threads().switchToNewThread() }
        : item,
    );

  return <NavGroup label={t("SIDEBAR.NAVIGATE")} items={items} />;
}
