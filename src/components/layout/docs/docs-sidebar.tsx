"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { CompanyName, LogoImage } from "@/components/elements/brand";
import { docsNavItems } from "./docs-navigation";

export function DocsSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="py-0"
              render={
                <Link
                  href={"/"}
                  className="flex w-full items-center gap-2"
                >
                  <LogoImage className="shrink-0" width={28} height={28} />
                  <CompanyName className="text-xl" />
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {t("DOCS_SIDEBAR.TITLE")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {docsNavItems.map((item) => {
                const isActive =
                  item.href === "/docs"
                    ? pathname === "/docs"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={t(item.name)}
                      className={cn(
                        isActive && "bg-primary/10 text-primary font-medium",
                      )}
                    >
                      <Link
                        href={item.href as Parameters<typeof Link>[0]["href"]}
                        className="flex items-center gap-2"
                      >
                        <item.icon
                          className={cn(
                            "size-4",
                            isActive && "text-primary",
                          )}
                        />
                        <span>{t(item.name)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
