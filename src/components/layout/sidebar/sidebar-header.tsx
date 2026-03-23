"use client";

import { DocsSearch } from "@/components/layout/docs/docs-search";
import { UserAvatar } from "@/components/layout/user/user-avatar";
import { UserDropdown } from "@/components/layout/user/user-dropdown";
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { LuLogIn } from "react-icons/lu";

interface SidebarHeaderProps {
  showSearch?: boolean;
}

export function SidebarHeader(props: SidebarHeaderProps) {
  const userDisplay = useUserDisplay();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-12 shrink-0 items-center border-b transition-[width,height] ease-linear">
      <div className="flex h-full w-full items-center gap-3 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-8 self-auto!" />
        {props.showSearch && (
          <div className="max-w-56 min-w-0 flex-1">
            <DocsSearch />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {mounted &&
            (userDisplay.user ? (
              <UserDropdown side="bottom" align="end">
                <button className="hover:bg-accent cursor-pointer rounded-md p-1 transition-colors">
                  <UserAvatar />
                </button>
              </UserDropdown>
            ) : (
              <Link
                href="/login"
                className="hover:bg-accent rounded-md p-1 transition-colors"
              >
                <LuLogIn className="size-5" />
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}
