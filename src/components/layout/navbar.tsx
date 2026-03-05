"use client";

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
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import { useLogoutMutation } from "@/hooks/auth-hook";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { isAuthenticatedAtom, isLoadingAuthAtom, userAtom } from "@/store/auth-store";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  LuChevronDown,
  LuCpu,
  LuLayoutDashboard,
  LuLogOut,
  LuMenu,
  LuShell,
  LuSparkles,
  LuTerminal,
  LuX,
} from "react-icons/lu";

const NAV_LINKS = [
  { href: "/models", key: "NAV.MODELS" },
  { href: "/pricing", key: "NAV.PRICING" },
] as const;

const DOC_LINKS = [
  { href: "/docs/claude-code", key: "NAV.CLAUDE_CODE", icon: LuTerminal },
  { href: "/docs/codex", key: "NAV.CODEX", icon: LuCpu },
  { href: "/docs/gemini-cli", key: "NAV.GEMINI_CLI", icon: LuSparkles },
  { href: "/docs/openclaw", key: "NAV.OPENCLAW", icon: LuShell },
] as const;

const ROLE_LABELS: Record<number, string> = {
  100: "AUTH.ROLE_ROOT",
  10: "AUTH.ROLE_ADMIN",
  1: "AUTH.ROLE_USER",
  0: "AUTH.ROLE_GUEST",
};

export function Navbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [docsOpen, setDocsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isLoadingAuth = useAtomValue(isLoadingAuthAtom);
  const user = useAtomValue(userAtom);
  const logoutMutation = useLogoutMutation();

  async function handleLogout() {
    setMobileOpen(false);
    try {
      await logoutMutation.mutateAsync();
      router.push("/");
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
  const roleKey = user
    ? ROLE_LABELS[user.role]
    : undefined;

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
          <Image
            src="/logo.webp"
            alt="Unorouter"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-foreground group-hover:text-muted-foreground text-lg font-bold tracking-tight transition-colors">
            UNO<span className="text-muted-foreground">ROUTER</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "text-[11px] font-medium tracking-widest uppercase transition-colors",
                pathname.startsWith(link.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(link.key)}
            </Link>
          ))}

          <div className="relative">
            <button
              onClick={() => setDocsOpen(!docsOpen)}
              onBlur={() => setTimeout(() => setDocsOpen(false), 200)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] font-medium tracking-widest uppercase transition-colors"
            >
              {t("NAV.DOCS")}
              <LuChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  docsOpen && "rotate-180",
                )}
              />
            </button>
            {docsOpen && (
              <div className="bg-popover border-border absolute top-full left-0 mt-2 w-48 border py-1">
                {DOC_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2 px-4 py-2 text-[11px] tracking-wider uppercase"
                  >
                    <link.icon className="h-3 w-3" />
                    {t(link.key)}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
                            {t(roleKey as any)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      window.open(
                        process.env.NEXT_PUBLIC_API_URL || "https://api.unorouter.ai",
                        "_blank",
                      );
                    }}
                  >
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

        {/* Mobile Menu */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <ThemeToggle />
          <button
            className="text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <LuX className="h-5 w-5" />
            ) : (
              <LuMenu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="bg-background border-border space-y-4 border-t px-6 py-6 font-mono md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-muted-foreground hover:text-foreground block text-sm tracking-wider uppercase"
            >
              {t(link.key)}
            </Link>
          ))}
          <div className="space-y-2">
            <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
              {t("NAV.DOCS")}
            </p>
            {DOC_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm tracking-wider uppercase"
              >
                <link.icon className="h-3 w-3" />
                {t(link.key)}
              </Link>
            ))}
          </div>
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
                <a
                  href={process.env.NEXT_PUBLIC_API_URL || "https://api.unorouter.ai"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
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
                onClick={() => setMobileOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm tracking-wider uppercase"
              >
                {t("NAV.LOG_IN")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
