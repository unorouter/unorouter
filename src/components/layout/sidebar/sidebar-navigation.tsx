"use client";

import {
  chatDocsNavGroups,
  chatDocsNavItemsOverview,
  docsNavGroups,
  docsNavItemsOverview,
  platformDocsNavGroups,
  platformDocsNavItemsOverview,
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
import { GuideIcon } from "@/components/pages/docs/guide-icon";
import { Icon } from "@/components/ui/icon";
import { APP_VALUES } from "@/lib/config/constants";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { usePathname } from "@/i18n/navigation";
import { PrefetchLink } from "@/components/layout/nav/prefetch-link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAui } from "@assistant-ui/react";
import { useTranslations } from "next-intl";
import type { SidebarNavConfig } from "./app-sidebar";

function NavGroup(props: { label: string; items: NavigationItem[] }) {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams<{ slug?: string }>();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{props.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {props.items.map((item) => {
            const isActive = isActiveLink(
              pathname,
              item.href,
              item.exact,
              params,
            );
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  render={
                    <PrefetchLink href={item.href} onClick={item.onClick} />
                  }
                  tooltip={t(item.name, APP_VALUES)}
                  isActive={isActive}
                  className={cn(
                    isActive && "bg-primary/10 text-primary font-medium",
                  )}
                >
                  {item.guideIcon ? (
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      <GuideIcon
                        iconKey={item.guideIcon.iconKey}
                        logoSrc={item.guideIcon.logoSrc}
                        logoBg={item.guideIcon.logoBg}
                        logoMono={item.guideIcon.logoMono}
                        accentClass={isActive ? "text-primary" : ""}
                        size={16}
                      />
                    </span>
                  ) : item.iconName ? (
                    <Icon
                      name={item.iconName}
                      className={cn("size-4", isActive && "text-primary")}
                    />
                  ) : item.iconComponent ? (
                    <item.iconComponent
                      className={cn("size-4", isActive && "text-primary")}
                    />
                  ) : null}
                  <span>{t(item.name, APP_VALUES)}</span>
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
  const pathname = usePathname();
  const { data: user } = useAuthQuery();
  const authenticated = !!user;

  if (props.navConfig === "chat") {
    return <ChatSidebarNav authenticated={authenticated} />;
  }

  if (props.navConfig === "generate") {
    return <GenerateSidebarNav authenticated={authenticated} />;
  }

  if (props.navConfig === "docs") {
    const mainNavItems = navigation(authenticated).filter(
      (item) => !item.hidden && item.href !== "/docs",
    );
    const platformDocs = pathname.startsWith("/docs/platform");
    const chatDocs = !platformDocs && pathname.startsWith("/docs/chat");
    const overview = platformDocs
      ? platformDocsNavItemsOverview
      : chatDocs
        ? chatDocsNavItemsOverview
        : docsNavItemsOverview;
    const groups = platformDocs
      ? platformDocsNavGroups
      : chatDocs
        ? chatDocsNavGroups
        : docsNavGroups;
    return (
      <>
        <NavGroup label={t("DOCS_SIDEBAR.TITLE")} items={overview} />
        {groups.map((group) => (
          <NavGroup
            key={group.labelKey}
            label={t(group.labelKey)}
            items={group.items}
          />
        ))}
        <NavGroup label={t("SIDEBAR.NAVIGATE")} items={mainNavItems} />
      </>
    );
  }

  const navItems = sidebarNavigation();
  const sidebarPaths = new Set(navItems.map((item) => item.href));
  const mainNavItems = navigation(authenticated).filter(
    (item) => !item.hidden && !sidebarPaths.has(item.href),
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

  // On /chat the Chat entry starts a new thread rather than navigating to the
  // route the reader is already on.
  const newThread = () => aui.threads().switchToNewThread();

  if (props.authenticated) {
    const accountItems = sidebarNavigation();
    const chatEntry = navigation(true).find((item) => item.href === "/chat");
    const items = chatEntry
      ? accountItems.toSpliced(1, 0, { ...chatEntry, onClick: newThread })
      : accountItems;
    return <NavGroup label={t("SIDEBAR.MENU")} items={items} />;
  }

  const items = navigation(false)
    .filter((item) => !item.hidden)
    .map((item) =>
      item.href === "/chat" ? { ...item, onClick: newThread } : item,
    );

  return <NavGroup label={t("SIDEBAR.NAVIGATE")} items={items} />;
}

function GenerateSidebarNav(props: { authenticated: boolean }) {
  const t = useTranslations();
  const items = navigation(props.authenticated).filter((item) => !item.hidden);
  return <NavGroup label={t("SIDEBAR.NAVIGATE")} items={items} />;
}
